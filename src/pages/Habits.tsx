import { useMemo, useState } from 'react';
import { Activity, Plus, Loader2, Archive, Smile, Check } from 'lucide-react';
import { format, subDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import {
  useHabits,
  useHabitLogs,
  useCreateHabit,
  useUpdateHabit,
  useToggleHabitLog,
} from '@/hooks/useHabits';
import type { Habit, HabitColor, HabitLog } from '@/lib/types';

const COLORS: { id: HabitColor; bg: string; ring: string }[] = [
  { id: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500/30' },
  { id: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  { id: 'sky', bg: 'bg-sky-500', ring: 'ring-sky-500/30' },
  { id: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-500/30' },
  { id: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500/30' },
];

const COLOR_BG: Record<HabitColor, string> = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
};

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function computeStreak(habitId: string, logs: HabitLog[]): number {
  const set = new Set(
    logs.filter((l) => l.habit_id === habitId).map((l) => l.date)
  );
  let streak = 0;
  let cursor = startOfDay(new Date());
  // Streak runs back from today; if today not done, allow yesterday as starting
  // point only if yesterday was done — otherwise streak = 0.
  if (!set.has(ymd(cursor))) {
    cursor = subDays(cursor, 1);
    if (!set.has(ymd(cursor))) return 0;
  }
  while (set.has(ymd(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export default function Habits() {
  const { data: habits = [], isLoading } = useHabits();
  const { data: logs = [] } = useHabitLogs(30);
  const toggleLog = useToggleHabitLog();
  const [creating, setCreating] = useState(false);

  const last7Days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  }, []);

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <Activity size={11} /> Gewoontes
          </div>
          <h1 className="page-title">Gewoontes</h1>
          <p className="page-sub">
            <span className="tabular">{habits.length}</span>{' '}
            {habits.length === 1 ? 'gewoonte' : 'gewoontes'} · dagelijks afvinken
          </p>
        </div>
        <div className="page-actions">
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            <Plus size={14} /> Nieuwe gewoonte
          </button>
        </div>
      </header>

      {creating && (
        <CreateHabitForm
          onClose={() => setCreating(false)}
        />
      )}

      {isLoading ? (
        <div className="text-sm text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Bezig met laden...
        </div>
      ) : habits.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header row with day labels */}
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_repeat(7,32px)_56px] items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted font-medium bg-surface2/50 border-b border-border">
            <span>Gewoonte</span>
            <span className="text-center">Streak</span>
            {last7Days.map((d) => (
              <span key={ymd(d)} className="text-center">
                {format(d, 'EEEEEE', { locale: nl })}
                <div className="text-[9px] opacity-60 tabular-nums">
                  {format(d, 'd')}
                </div>
              </span>
            ))}
            <span></span>
          </div>

          <div className="divide-y divide-border">
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                days={last7Days}
                logs={logs}
                onToggle={(date) =>
                  toggleLog.mutate({ habitId: h.id, date })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HabitRow({
  habit,
  days,
  logs,
  onToggle,
}: {
  habit: Habit;
  days: Date[];
  logs: HabitLog[];
  onToggle: (date: string) => void;
}) {
  const update = useUpdateHabit();
  const habitLogs = useMemo(
    () => logs.filter((l) => l.habit_id === habit.id),
    [logs, habit.id]
  );
  const streak = useMemo(() => computeStreak(habit.id, logs), [habit.id, logs]);
  const colorBg = COLOR_BG[habit.color];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_repeat(7,32px)_56px] items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface2/30">
      <div className="flex items-center gap-2 min-w-0">
        {habit.emoji && (
          <span className="text-base shrink-0">{habit.emoji}</span>
        )}
        <span className="truncate">{habit.title}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface2 text-xs text-muted tabular-nums shrink-0">
        🔥 {streak}
      </div>
      {days.map((d) => {
        const dateStr = ymd(d);
        const done = habitLogs.some((l) => isSameDay(parseISO(l.date), d));
        return (
          <button
            key={dateStr}
            onClick={() => onToggle(dateStr)}
            className={clsx(
              'w-7 h-7 rounded-md flex items-center justify-center transition-colors mx-auto',
              done
                ? `${colorBg} text-white hover:opacity-90`
                : 'border border-border bg-surface hover:border-accent/50'
            )}
            aria-label={done ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
          >
            {done && <Check size={14} strokeWidth={3} />}
          </button>
        );
      })}
      <button
        onClick={() =>
          update.mutate({
            id: habit.id,
            patch: { archived_at: new Date().toISOString() },
          })
        }
        className="text-muted hover:text-red-500 p-1 rounded justify-self-end opacity-0 group-hover:opacity-100 hover:opacity-100"
        title="Archiveer"
      >
        <Archive size={13} />
      </button>
    </div>
  );
}

function CreateHabitForm({ onClose }: { onClose: () => void }) {
  const create = useCreateHabit();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState<HabitColor>('amber');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      emoji: emoji.trim() || null,
      color,
    });
    onClose();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 bg-surface border border-border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            placeholder="🏃"
            className="w-12 text-center text-xl py-1.5 bg-surface2 border border-border rounded-md focus:border-accent transition-colors"
            aria-label="Emoji"
          />
          <Smile
            size={11}
            className="absolute -bottom-0.5 -right-0.5 text-muted bg-surface rounded-full"
          />
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. Sport, Lezen, Meditatie..."
          className="flex-1 px-3 py-2 bg-surface2 border border-border rounded-md text-sm focus:border-accent transition-colors"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Kleur</span>
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setColor(c.id)}
            className={clsx(
              'w-5 h-5 rounded-full transition-all',
              c.bg,
              color === c.id ? `ring-2 ring-offset-2 ring-offset-surface ${c.ring}` : ''
            )}
            aria-label={c.id}
          />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted hover:text-text"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={!title.trim() || create.isPending}
            className="px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Bezig...' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </form>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-10 text-center">
      <Activity size={20} className="mx-auto text-muted mb-3" />
      <p className="font-medium mb-1">Nog geen gewoontes</p>
      <p className="text-sm text-muted max-w-md mx-auto mb-4">
        Voeg dagelijkse rituelen toe (sport, lezen, meditatie) en tik ze af.
        Streaks geven gratis dopamine.
      </p>
      <button
        onClick={onCreate}
        className="px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90"
      >
        Eerste gewoonte aanmaken
      </button>
    </div>
  );
}
