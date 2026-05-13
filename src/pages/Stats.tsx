import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Flame,
  TrendingUp,
  Target,
  Star,
} from 'lucide-react';
import {
  addDays,
  differenceInDays,
  endOfWeek,
  format,
  getISOWeek,
  parseISO,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { DailyPlan, Todo } from '@/lib/types';

const HEATMAP_WEEKS = 14;
const RATING_DAYS = 30;

interface DayBucket {
  date: string;
  count: number;
  effortMin: number;
}

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// === Data hooks ===

function useCompletedTodosLastDays(days: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stats-completed', days],
    enabled: !!user,
    queryFn: async (): Promise<Todo[]> => {
      const from = ymd(subDays(new Date(), days));
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('status', 'done')
        .gte('completed_at', from)
        .order('completed_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Todo[];
    },
  });
}

function useDailyPlansLastDays(days: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stats-plans', days],
    enabled: !!user,
    queryFn: async (): Promise<DailyPlan[]> => {
      const from = ymd(subDays(new Date(), days));
      const { data, error } = await supabase
        .from('daily_plans')
        .select('*')
        .gte('date', from)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyPlan[];
    },
  });
}

// === Page ===

export default function Stats() {
  const today = useMemo(() => new Date(), []);
  const horizon = HEATMAP_WEEKS * 7;
  const { data: doneTodos = [] } = useCompletedTodosLastDays(horizon);
  const { data: plans = [] } = useDailyPlansLastDays(horizon);

  // Build per-day buckets for heatmap + records
  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const t of doneTodos) {
      if (!t.completed_at) continue;
      const key = ymd(parseISO(t.completed_at));
      const b = map.get(key) ?? { date: key, count: 0, effortMin: 0 };
      b.count += 1;
      b.effortMin += t.effort_min ?? 0;
      map.set(key, b);
    }
    return map;
  }, [doneTodos]);

  // === Records ===
  const records = useMemo(() => {
    let bestDay = { date: '', count: 0 };
    for (const b of buckets.values()) {
      if (b.count > bestDay.count) bestDay = { date: b.date, count: b.count };
    }

    // Streak of consecutive days with at least 1 todo done (count back from today)
    let streak = 0;
    let cursor = today;
    while (true) {
      const key = ymd(cursor);
      const b = buckets.get(key);
      if (!b || b.count === 0) {
        // Allow today to be 0 (day not over) — only break if YESTERDAY also empty
        if (cursor.getTime() === today.getTime()) {
          cursor = subDays(cursor, 1);
          continue;
        }
        break;
      }
      streak += 1;
      cursor = subDays(cursor, 1);
    }

    // Best week (most todos done in a single calendar week)
    const byWeek = new Map<string, number>();
    for (const b of buckets.values()) {
      const wk = `${parseISO(b.date).getFullYear()}-W${String(
        getISOWeek(parseISO(b.date))
      ).padStart(2, '0')}`;
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + b.count);
    }
    let bestWeek = { week: '', count: 0 };
    for (const [wk, n] of byWeek.entries()) {
      if (n > bestWeek.count) bestWeek = { week: wk, count: n };
    }

    // Average day rating
    const ratings = plans.filter((p) => p.day_rating != null);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, p) => s + (p.day_rating ?? 0), 0) / ratings.length
        : null;

    return { bestDay, streak, bestWeek, avgRating, ratingsCount: ratings.length };
  }, [buckets, plans, today]);

  // === This-week / last-week delta ===
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

  const thisWeekCount = doneTodos.filter(
    (t) => t.completed_at && parseISO(t.completed_at) >= thisWeekStart
  ).length;
  const lastWeekCount = doneTodos.filter(
    (t) =>
      t.completed_at &&
      parseISO(t.completed_at) >= lastWeekStart &&
      parseISO(t.completed_at) <= lastWeekEnd
  ).length;
  const delta =
    lastWeekCount > 0
      ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
      : null;

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <BarChart3 size={11} /> Stats
          </div>
          <h1 className="page-title">Voortgang</h1>
          <p className="page-sub">
            Wat je gedaan hebt, hoe je je voelde — over de laatste{' '}
            {HEATMAP_WEEKS} weken.
          </p>
        </div>
      </header>

      {/* Personal records grid */}
      <section className="stats-records">
        <RecordCard
          icon={<Flame size={14} />}
          label="huidige streak"
          value={`${records.streak}`}
          suffix={records.streak === 1 ? 'dag' : 'dagen'}
          hint={
            records.streak === 0
              ? 'Vink iets af om te starten'
              : 'Aaneengesloten dagen met ≥ 1 todo af'
          }
        />
        <RecordCard
          icon={<Target size={14} />}
          label="beste dag"
          value={`${records.bestDay.count}`}
          suffix={records.bestDay.count === 1 ? 'todo' : "todo's"}
          hint={
            records.bestDay.date
              ? format(parseISO(records.bestDay.date), 'd MMM yyyy', { locale: nl })
              : '—'
          }
        />
        <RecordCard
          icon={<TrendingUp size={14} />}
          label="beste week"
          value={`${records.bestWeek.count}`}
          suffix={records.bestWeek.count === 1 ? 'todo' : "todo's"}
          hint={records.bestWeek.week ? `week ${records.bestWeek.week.split('-W')[1]}` : '—'}
        />
        <RecordCard
          icon={<Star size={14} />}
          label="dag-rating gem."
          value={
            records.avgRating != null
              ? records.avgRating.toFixed(1)
              : '—'
          }
          suffix="/ 5"
          hint={
            records.ratingsCount > 0
              ? `${records.ratingsCount} ratings`
              : 'Rate dagen in shutdown'
          }
        />
      </section>

      {/* Weekly delta callout */}
      <section className="stats-delta">
        <div className="stats-delta-num tabular">{thisWeekCount}</div>
        <div className="stats-delta-meta">
          <div className="stats-delta-label">deze week voltooid</div>
          {delta != null && (
            <div
              className={clsx(
                'stats-delta-change tabular',
                delta > 0 && 'up',
                delta < 0 && 'down'
              )}
            >
              {delta > 0 ? '+' : ''}
              {delta}% vs vorige week ({lastWeekCount})
            </div>
          )}
          {delta == null && (
            <div className="stats-delta-change muted-text">Geen data van vorige week</div>
          )}
        </div>
      </section>

      {/* Heatmap */}
      <section className="stats-section">
        <h2 className="section-title">
          Activiteit · {HEATMAP_WEEKS} weken
        </h2>
        <Heatmap weeks={HEATMAP_WEEKS} buckets={buckets} today={today} />
        <div className="stats-legend">
          <span className="muted-text font-mono-tight">minder</span>
          <span className="stats-heat-cell" data-level="0" />
          <span className="stats-heat-cell" data-level="1" />
          <span className="stats-heat-cell" data-level="2" />
          <span className="stats-heat-cell" data-level="3" />
          <span className="stats-heat-cell" data-level="4" />
          <span className="muted-text font-mono-tight">meer</span>
        </div>
      </section>

      {/* Day rating trend */}
      <section className="stats-section">
        <h2 className="section-title">
          Dag-rating · laatste {RATING_DAYS} dagen
        </h2>
        <RatingChart plans={plans} days={RATING_DAYS} today={today} />
      </section>
    </div>
  );
}

function RecordCard({
  icon,
  label,
  value,
  suffix,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  hint: string;
}) {
  return (
    <div className="stats-record">
      <div className="stats-record-head">
        <span className="stats-record-icon">{icon}</span>
        <span className="stats-record-label">{label}</span>
      </div>
      <div className="stats-record-value tabular">
        {value}
        {suffix && <span className="stats-record-suffix"> {suffix}</span>}
      </div>
      <div className="stats-record-hint">{hint}</div>
    </div>
  );
}

function Heatmap({
  weeks,
  buckets,
  today,
}: {
  weeks: number;
  buckets: Map<string, DayBucket>;
  today: Date;
}) {
  // Anchor on the Monday `weeks` weeks ago
  const gridStart = startOfWeek(subDays(today, (weeks - 1) * 7), {
    weekStartsOn: 1,
  });
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  function level(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  }

  return (
    <div className="stats-heat">
      {/* Weekday labels */}
      <div className="stats-heat-rows">
        <span className="stats-heat-row-label">ma</span>
        <span className="stats-heat-row-label"></span>
        <span className="stats-heat-row-label">wo</span>
        <span className="stats-heat-row-label"></span>
        <span className="stats-heat-row-label">vr</span>
        <span className="stats-heat-row-label"></span>
        <span className="stats-heat-row-label">zo</span>
      </div>

      <div
        className="stats-heat-grid"
        style={{ gridTemplateColumns: `repeat(${weeks}, 12px)` }}
      >
        {days.map((d) => {
          const key = ymd(d);
          const bucket = buckets.get(key);
          const count = bucket?.count ?? 0;
          const isFuture = d > today;
          return (
            <span
              key={key}
              className="stats-heat-cell"
              data-level={isFuture ? '-1' : level(count)}
              title={
                isFuture
                  ? format(d, 'EEE d MMM', { locale: nl })
                  : `${count} todo${count === 1 ? '' : "'s"} · ${format(
                      d,
                      'EEE d MMM',
                      { locale: nl }
                    )}`
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function RatingChart({
  plans,
  days,
  today,
}: {
  plans: DailyPlan[];
  days: number;
  today: Date;
}) {
  const start = subDays(today, days - 1);
  const series: { date: string; rating: number | null }[] = [];
  const planByDate = new Map<string, DailyPlan>();
  for (const p of plans) planByDate.set(p.date, p);
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const key = ymd(d);
    const plan = planByDate.get(key);
    series.push({ date: key, rating: plan?.day_rating ?? null });
  }

  const hasAnyRating = series.some((s) => s.rating != null);
  if (!hasAnyRating) {
    return (
      <p className="muted-text" style={{ fontSize: 13, fontStyle: 'italic' }}>
        Nog geen dag-ratings. Gebruik de shutdown-ritueel om je dag te raten.
      </p>
    );
  }

  return (
    <div className="stats-chart">
      {series.map((s, i) => {
        const r = s.rating ?? 0;
        const isToday = differenceInDays(today, parseISO(s.date)) === 0;
        return (
          <div
            key={s.date}
            className={clsx('stats-bar-col', isToday && 'today')}
            title={
              s.rating != null
                ? `${format(parseISO(s.date), 'EEE d MMM', { locale: nl })}: ${s.rating}/5`
                : `${format(parseISO(s.date), 'EEE d MMM', { locale: nl })}: —`
            }
          >
            <div className="stats-bar-track">
              {s.rating != null && (
                <div
                  className="stats-bar-fill"
                  data-rating={s.rating}
                  style={{ height: `${(r / 5) * 100}%` }}
                />
              )}
            </div>
            {i % 5 === 0 && (
              <span className="stats-bar-label font-mono-tight">
                {format(parseISO(s.date), 'd/M')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
