import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Todo, TodoStatus, Priority, RecurrenceType, Scope } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { addDays, addMonths, format, getDay, parseISO } from 'date-fns';

export function useTodos(filter?: {
  projectId?: string | null;     // null = inbox (no project), undefined = all
  status?: TodoStatus;
  sourceNoteId?: string;
}) {
  const { user } = useAuth();
  const key = ['todos', filter ?? {}];

  return useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<Todo[]> => {
      let q = supabase
        .from('todos')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (filter?.projectId === null) q = q.is('project_id', null);
      else if (filter?.projectId) q = q.eq('project_id', filter.projectId);
      if (filter?.status) q = q.eq('status', filter.status);
      if (filter?.sourceNoteId) q = q.eq('source_note_id', filter.sourceNoteId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Todo[];
    },
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      project_id?: string | null;
      priority?: Priority;
      status?: TodoStatus;
      due_date?: string | null;
      start_time?: string | null;
      duration_min?: number | null;
      description?: string | null;
      effort_min?: number | null;
      recurrence_type?: RecurrenceType | null;
      recurrence_dates?: string[] | null;
      scope?: Scope;
      source_note_id?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: input.title,
          project_id: input.project_id ?? null,
          priority: input.priority ?? 2,
          status: input.status ?? 'todo',
          due_date: input.due_date ?? null,
          start_time: input.start_time ?? null,
          duration_min: input.duration_min ?? null,
          description: input.description ?? null,
          effort_min: input.effort_min ?? null,
          recurrence_type: input.recurrence_type ?? null,
          recurrence_dates: input.recurrence_dates ?? null,
          scope: input.scope ?? 'work',
          source_note_id: input.source_note_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}

export interface TodoPatch {
  title?: string;
  description?: string | null;
  status?: TodoStatus;
  priority?: Priority;
  due_date?: string | null;
  start_time?: string | null;
  duration_min?: number | null;
  effort_min?: number | null;
  recurrence_type?: RecurrenceType | null;
  recurrence_dates?: string[] | null;
  scope?: Scope;
  project_id?: string | null;
  position?: number;
  completed_at?: string | null;
}

// Compute the next due_date based on a recurrence rule.
// Returns null if no due_date or no recurrence.
// For 'custom', picks the next date from recurrence_dates that's > current
// due_date.
export function nextRecurrence(
  current: Pick<Todo, 'recurrence_type' | 'due_date' | 'recurrence_dates'>
): string | null {
  if (!current.recurrence_type) return null;
  if (current.recurrence_type === 'custom') {
    const dates = (current.recurrence_dates ?? []).slice().sort();
    if (dates.length === 0) return null;
    const cursor = current.due_date ?? format(new Date(), 'yyyy-MM-dd');
    // Next date strictly after the current due_date
    const next = dates.find((d) => d > cursor);
    return next ?? null;
  }
  const base = current.due_date ? parseISO(current.due_date) : new Date();
  let next: Date;
  switch (current.recurrence_type) {
    case 'daily':
      next = addDays(base, 1);
      break;
    case 'weekdays': {
      next = addDays(base, 1);
      // Skip Sat (6) and Sun (0)
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      break;
    }
    case 'weekly':
      next = addDays(base, 7);
      break;
    case 'monthly':
      next = addMonths(base, 1);
      break;
    default:
      return null;
  }
  return format(next, 'yyyy-MM-dd');
}

// Hoeveel future instances we van te voren genereren per type.
// Genoeg om in de agenda zichtbaar te zijn, weinig genoeg om geen clutter te
// worden. Bij voltooien spawnt useUpdateTodo automatisch een nieuwe waardoor
// de window blijft rollen.
const RECURRENCE_WINDOW: Record<RecurrenceType, number> = {
  daily: 7,      // 1 week vooruit
  weekdays: 5,   // 1 werkweek vooruit
  weekly: 4,     // 1 maand vooruit
  monthly: 3,    // 3 maanden vooruit
  custom: 12,    // tot 12 toekomstige datums uit de array
};

/**
 * Zorg dat er een rolling window aan future-instances bestaat voor een
 * recurring todo. Dedupt op (user_id, title, recurrence_type, due_date) zodat
 * herhaald aanroepen geen duplicates maakt.
 */
async function ensureFutureRecurrences(
  todo: Todo,
  userId: string
): Promise<void> {
  if (!todo.recurrence_type) return;
  const window = RECURRENCE_WINDOW[todo.recurrence_type] ?? 4;

  // Bestaande open future-instances ophalen (zelfde titel + recurrence_type)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: existing } = await supabase
    .from('todos')
    .select('due_date')
    .eq('user_id', userId)
    .eq('title', todo.title)
    .eq('recurrence_type', todo.recurrence_type)
    .eq('status', 'todo')
    .gte('due_date', todayStr);

  const existingDates = new Set(
    (existing ?? []).map((r: any) => r.due_date as string)
  );

  // Genereer window aan toekomst-datums vanaf de huidige todo
  let current: Pick<Todo, 'recurrence_type' | 'due_date' | 'recurrence_dates'> = {
    recurrence_type: todo.recurrence_type,
    due_date: todo.due_date,
    recurrence_dates: todo.recurrence_dates,
  };
  const rows: any[] = [];
  for (let i = 0; i < window; i++) {
    const nextDate = nextRecurrence(current);
    if (!nextDate) break;
    if (!existingDates.has(nextDate)) {
      rows.push({
        user_id: userId,
        title: todo.title,
        description: todo.description,
        project_id: todo.project_id,
        priority: todo.priority,
        status: 'todo',
        due_date: nextDate,
        effort_min: todo.effort_min,
        recurrence_type: todo.recurrence_type,
        recurrence_dates: todo.recurrence_dates,
      });
    }
    current = { ...current, due_date: nextDate };
  }
  if (rows.length > 0) {
    await supabase.from('todos').insert(rows);
  }
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TodoPatch }) => {
      const finalPatch = { ...patch };
      if (patch.status === 'done' && patch.completed_at === undefined) {
        finalPatch.completed_at = new Date().toISOString();
      }
      if (patch.status && patch.status !== 'done' && patch.completed_at === undefined) {
        finalPatch.completed_at = null;
      }

      // Peek at previous row when we need to (status→done for spawn logic,
      // or title/recurrence_type change for orphan cleanup).
      let previous: Todo | null = null;
      const needsPrev =
        patch.status === 'done' ||
        patch.title !== undefined ||
        patch.recurrence_type !== undefined;
      if (needsPrev) {
        const { data: prev } = await supabase
          .from('todos')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        previous = (prev as Todo) ?? null;
      }

      // Recurrence orphan cleanup: when title or recurrence_type changes on a
      // recurring todo, delete future open instances of the OLD series so we
      // don't accumulate ghosts under the renamed/retype'd series.
      if (
        user &&
        previous &&
        previous.recurrence_type &&
        ((patch.title !== undefined && patch.title !== previous.title) ||
          (patch.recurrence_type !== undefined &&
            patch.recurrence_type !== previous.recurrence_type))
      ) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        await supabase
          .from('todos')
          .delete()
          .eq('user_id', user.id)
          .eq('title', previous.title)
          .eq('recurrence_type', previous.recurrence_type)
          .eq('status', 'todo')
          .gte('due_date', todayStr)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('todos')
        .update(finalPatch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Spawn next recurrence instance if transitioning open → done on a
      // recurring todo (rolling window stays full).
      if (
        user &&
        previous &&
        previous.status !== 'done' &&
        previous.recurrence_type
      ) {
        const nextDate = nextRecurrence(previous);
        if (nextDate) {
          await supabase.from('todos').insert({
            user_id: user.id,
            title: previous.title,
            description: previous.description,
            project_id: previous.project_id,
            priority: previous.priority,
            status: 'todo',
            due_date: nextDate,
            effort_min: previous.effort_min,
            recurrence_type: previous.recurrence_type,
            recurrence_dates: previous.recurrence_dates,
          });
        }
      }

      // Als recurrence wordt aangezet (of veranderd), zorg direct dat de
      // future-window gevuld is. Idempotent via dedup.
      if (
        user &&
        patch.recurrence_type !== undefined &&
        (data as Todo).recurrence_type
      ) {
        await ensureFutureRecurrences(data as Todo, user.id);
      }

      return data as Todo;
    },
    // Optimistic update — applies to both list queries (['todos', ...]) and
    // the single-todo query (['todo', id]) so the detail modal reflects the
    // change instantly without waiting for round-trip.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['todos'] });
      await qc.cancelQueries({ queryKey: ['todo', id] });

      const previousLists = qc.getQueriesData<Todo[]>({ queryKey: ['todos'] });
      previousLists.forEach(([key, list]) => {
        if (!list) return;
        qc.setQueryData<Todo[]>(
          key,
          list.map((t) => (t.id === id ? { ...t, ...patch } : t))
        );
      });

      const previousSingle = qc.getQueryData<Todo>(['todo', id]);
      if (previousSingle) {
        qc.setQueryData<Todo>(['todo', id], { ...previousSingle, ...patch });
      }

      return { previousLists, previousSingle };
    },
    onError: (_err, vars, ctx) => {
      ctx?.previousLists.forEach(([key, list]) => qc.setQueryData(key, list));
      if (ctx?.previousSingle) {
        qc.setQueryData(['todo', vars.id], ctx.previousSingle);
      }
    },
    onSuccess: (todo) => {
      // Keep single-todo cache in sync with server response.
      qc.setQueryData(['todo', todo.id], todo);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      qc.invalidateQueries({ queryKey: ['todo', vars.id] });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}
