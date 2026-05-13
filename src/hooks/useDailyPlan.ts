import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyPlan } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

// One DailyPlan per (user, date). Auto-creates an empty row on first read.
export function useDailyPlan(date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['daily-plan', date],
    enabled: !!user,
    queryFn: async (): Promise<DailyPlan | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('date', date)
        .maybeSingle();
      if (error) throw error;
      return (data as DailyPlan) ?? null;
    },
  });
}

export function useUpsertDailyPlan() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      date: string;
      top3_todo_ids?: string[];
      shutdown_note?: string | null;
      next_day_top3?: string[];
      day_rating?: number | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Upsert by (user_id, date)
      const { data: existing } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('date', input.date)
        .maybeSingle();

      const payload: Record<string, unknown> = { user_id: user.id, date: input.date };
      if (input.top3_todo_ids !== undefined) payload.top3_todo_ids = input.top3_todo_ids;
      if (input.shutdown_note !== undefined) payload.shutdown_note = input.shutdown_note;
      if (input.next_day_top3 !== undefined) payload.next_day_top3 = input.next_day_top3;
      if (input.day_rating !== undefined) payload.day_rating = input.day_rating;

      if (existing) {
        const { data, error } = await supabase
          .from('daily_plans')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as DailyPlan;
      }
      const { data, error } = await supabase
        .from('daily_plans')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as DailyPlan;
    },
    onSuccess: (plan) => {
      qc.setQueryData(['daily-plan', plan.date], plan);
    },
  });
}
