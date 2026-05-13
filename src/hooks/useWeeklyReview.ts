import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { WeeklyReview } from '@/lib/types';
import { format, startOfWeek } from 'date-fns';

export function currentWeekStart(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function useWeeklyReview(weekStart: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['weekly_review', weekStart],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyReview | null> => {
      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data as WeeklyReview) ?? null;
    },
  });
}

export function useUpsertWeeklyReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Partial<
        Pick<
          WeeklyReview,
          | 'went_well'
          | 'time_wasters'
          | 'carry_over'
          | 'next_week_top3'
          | 'completed_at'
        >
      > & { week_start: string }
    ) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('weekly_reviews')
        .upsert(
          { user_id: user.id, ...input },
          { onConflict: 'user_id,week_start' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as WeeklyReview;
    },
    onSuccess: (review) => {
      qc.setQueryData(['weekly_review', review.week_start], review);
      qc.invalidateQueries({ queryKey: ['weekly_review'] });
    },
  });
}
