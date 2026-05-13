import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToasts } from '@/store/toasts';
import { useAuth } from '@/hooks/useAuth';
import type { Note, Todo, TodoStatus } from '@/lib/types';

interface BulkPatch {
  status?: TodoStatus;
  due_date?: string | null;
  project_id?: string | null;
}

export function useBulkUpdateTodos() {
  const qc = useQueryClient();
  const showToast = useToasts((s) => s.showToast);

  return useCallback(
    async (ids: string[], patch: BulkPatch) => {
      if (ids.length === 0) return;
      const finalPatch: any = { ...patch };
      if (patch.status === 'done') {
        finalPatch.completed_at = new Date().toISOString();
      } else if (patch.status) {
        finalPatch.completed_at = null;
      }
      const { error } = await supabase
        .from('todos')
        .update(finalPatch)
        .in('id', ids);
      if (error) {
        showToast({ message: `Update mislukt: ${error.message}` });
        return;
      }
      qc.invalidateQueries({ queryKey: ['todos'] });
      const label =
        patch.status === 'done'
          ? `${ids.length} voltooid`
          : patch.due_date !== undefined
          ? `${ids.length} gepland`
          : patch.project_id !== undefined
          ? `${ids.length} verplaatst`
          : `${ids.length} bijgewerkt`;
      showToast({ message: label, durationMs: 2500 });
    },
    [qc, showToast]
  );
}

function todoToInsertRow(t: Todo, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description,
    project_id: t.project_id,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    start_time: t.start_time,
    duration_min: t.duration_min,
    effort_min: t.effort_min,
    recurrence_type: t.recurrence_type,
    scope: t.scope,
    source_note_id: t.source_note_id,
    position: t.position,
    completed_at: t.completed_at,
  };
}

function noteToInsertRow(n: Note, userId: string) {
  return {
    id: n.id,
    user_id: userId,
    project_id: n.project_id,
    todo_id: n.todo_id,
    title: n.title,
    content: n.content,
    body_text: n.body_text,
    tldr: n.tldr,
    last_reviewed_at: n.last_reviewed_at,
    review_interval_days: n.review_interval_days,
    review_enabled: n.review_enabled,
    is_done: n.is_done,
  };
}

// Delete a todo with a 5s undo toast. The row is removed immediately from the
// UI cache and database. Notes that referenced this todo via `todo_id` get
// cascade-deleted by Postgres — we snapshot them first so undo can restore
// the entire tree, not just the parent row.
export function useDeleteTodoWithUndo() {
  const qc = useQueryClient();
  const showToast = useToasts((s) => s.showToast);
  const { user } = useAuth();

  return useCallback(
    async (todo: Todo) => {
      // Snapshot any notes attached to this todo before delete (Postgres cascade
      // would drop them otherwise).
      const { data: childNotes } = await supabase
        .from('notes')
        .select('*')
        .eq('todo_id', todo.id);
      const noteSnapshot = (childNotes ?? []) as Note[];

      const { error } = await supabase.from('todos').delete().eq('id', todo.id);
      if (error) {
        showToast({ message: `Verwijderen mislukt: ${error.message}` });
        return;
      }
      qc.invalidateQueries({ queryKey: ['todos'] });
      if (noteSnapshot.length > 0) qc.invalidateQueries({ queryKey: ['notes'] });

      const childCount = noteSnapshot.length;
      const message =
        childCount > 0
          ? `Verwijderd · ${childCount} ${childCount === 1 ? 'notitie' : 'notities'} ook weg`
          : 'Verwijderd';

      showToast({
        message,
        action: {
          label: 'Ongedaan maken',
          onClick: async () => {
            if (!user) return;
            const { error: insertError } = await supabase
              .from('todos')
              .insert(todoToInsertRow(todo, user.id));
            if (insertError) {
              showToast({ message: `Herstellen mislukt: ${insertError.message}` });
              return;
            }
            if (noteSnapshot.length > 0) {
              const { error: notesError } = await supabase
                .from('notes')
                .insert(noteSnapshot.map((n) => noteToInsertRow(n, user.id)));
              if (notesError) {
                showToast({
                  message: `Todo hersteld, notities mislukt: ${notesError.message}`,
                });
              }
              qc.invalidateQueries({ queryKey: ['notes'] });
            }
            qc.invalidateQueries({ queryKey: ['todos'] });
          },
        },
      });
    },
    [qc, showToast, user]
  );
}

// Same pattern for bulk delete: removes N rows and gives one undo action.
export function useBulkDeleteTodosWithUndo() {
  const qc = useQueryClient();
  const showToast = useToasts((s) => s.showToast);
  const { user } = useAuth();

  return useCallback(
    async (todos: Todo[]) => {
      if (todos.length === 0) return;
      const ids = todos.map((t) => t.id);

      // Snapshot child notes for all selected todos in one query.
      const { data: childNotes } = await supabase
        .from('notes')
        .select('*')
        .in('todo_id', ids);
      const noteSnapshot = (childNotes ?? []) as Note[];

      const { error } = await supabase.from('todos').delete().in('id', ids);
      if (error) {
        showToast({ message: `Verwijderen mislukt: ${error.message}` });
        return;
      }
      qc.invalidateQueries({ queryKey: ['todos'] });
      if (noteSnapshot.length > 0) qc.invalidateQueries({ queryKey: ['notes'] });

      const childCount = noteSnapshot.length;
      const baseMessage = `${todos.length} verwijderd`;
      const message =
        childCount > 0
          ? `${baseMessage} · ${childCount} ${childCount === 1 ? 'notitie' : 'notities'} ook weg`
          : baseMessage;

      showToast({
        message,
        action: {
          label: 'Ongedaan maken',
          onClick: async () => {
            if (!user) return;
            const { error: insertError } = await supabase
              .from('todos')
              .insert(todos.map((t) => todoToInsertRow(t, user.id)));
            if (insertError) {
              showToast({ message: `Herstellen mislukt: ${insertError.message}` });
              return;
            }
            if (noteSnapshot.length > 0) {
              const { error: notesError } = await supabase
                .from('notes')
                .insert(noteSnapshot.map((n) => noteToInsertRow(n, user.id)));
              if (notesError) {
                showToast({
                  message: `Todos hersteld, notities mislukt: ${notesError.message}`,
                });
              }
              qc.invalidateQueries({ queryKey: ['notes'] });
            }
            qc.invalidateQueries({ queryKey: ['todos'] });
          },
        },
      });
    },
    [qc, showToast, user]
  );
}
