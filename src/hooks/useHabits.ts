import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Habit, HabitColor, HabitLog } from '@/lib/types';
import { format, subDays } from 'date-fns';

export function useHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['habits'],
    enabled: !!user,
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .is('archived_at', null)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Habit[];
    },
  });
}

// Fetch logs for the last N days (default 30 for streak calc + 7-day grid)
export function useHabitLogs(days = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['habit_logs', days],
    enabled: !!user,
    queryFn: async (): Promise<HabitLog[]> => {
      const from = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('date', from)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as HabitLog[];
    },
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      emoji?: string | null;
      color?: HabitColor;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          title: input.title,
          emoji: input.emoji ?? null,
          color: input.color ?? 'amber',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Habit, 'title' | 'emoji' | 'color' | 'position' | 'archived_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('habits')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useToggleHabitLog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      if (!user) throw new Error('Not authenticated');
      // Try to find an existing log for that (habit, date)
      const { data: existing } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habitId)
        .eq('date', date)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', (existing as any).id);
        if (error) throw error;
        return { habitId, date, action: 'removed' as const };
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .insert({ user_id: user.id, habit_id: habitId, date });
        if (error) throw error;
        return { habitId, date, action: 'added' as const };
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_logs'] }),
  });
}
