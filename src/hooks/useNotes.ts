import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { blockNoteToText } from '@/lib/ai';

export function useNotes(filter?: {
  projectId?: string | null;     // null = standalone (no project AND no todo), undefined = all
  todoId?: string;
  done?: boolean;                // undefined = all, false = open only, true = done only
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notes', filter ?? {}],
    enabled: !!user,
    queryFn: async (): Promise<Note[]> => {
      let q = supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filter?.projectId === null) {
        q = q.is('project_id', null).is('todo_id', null);
      } else if (filter?.projectId) {
        q = q.eq('project_id', filter.projectId);
      }
      if (filter?.todoId) q = q.eq('todo_id', filter.todoId);
      if (filter?.done !== undefined) q = q.eq('is_done', filter.done);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ['note', id],
    enabled: !!id,
    queryFn: async (): Promise<Note | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as Note) ?? null;
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      title?: string;
      project_id?: string | null;
      todo_id?: string | null;
      content?: unknown;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: input.title ?? 'Untitled',
          project_id: input.project_id ?? null,
          todo_id: input.todo_id ?? null,
          content: input.content ?? null,
          body_text: input.content ? blockNoteToText(input.content) : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export interface NotePatch {
  title?: string;
  content?: unknown;
  project_id?: string | null;
  todo_id?: string | null;
  tldr?: string | null;
  last_reviewed_at?: string | null;
  review_interval_days?: number;
  review_enabled?: boolean;
  is_done?: boolean;
}

// Notes due for review: never-reviewed OR reviewed > interval days ago
export function useReviewQueue() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notes', 'review-queue'],
    enabled: !!user,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('review_enabled', true)
        .not('tldr', 'is', null)
        .order('last_reviewed_at', { ascending: true, nullsFirst: true });
      if (error) throw error;
      const now = new Date();
      return ((data ?? []) as Note[]).filter((n) => {
        if (!n.last_reviewed_at) return true;
        const last = new Date(n.last_reviewed_at);
        const dueDate = new Date(last);
        dueDate.setDate(dueDate.getDate() + (n.review_interval_days ?? 1));
        return dueDate <= now;
      });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: NotePatch }) => {
      // Wanneer content verandert, schrijf ook een plain-text variant naar
      // body_text zodat full-text search de inhoud van het BlockNote-document
      // mee-indexeert. Geen extra round-trip nodig.
      const finalPatch = { ...patch } as any;
      if ('content' in patch) {
        finalPatch.body_text = blockNoteToText(patch.content);
      }
      const { data, error } = await supabase
        .from('notes')
        .update(finalPatch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.setQueryData(['note', note.id], note);
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}
