import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, X, ArrowRight, Star } from 'lucide-react';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useDailyPlan, useUpsertDailyPlan } from '@/hooks/useDailyPlan';
import { useTodos } from '@/hooks/useTodos';
import { useToasts } from '@/store/toasts';
import type { Priority } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX = 3;
const PRIO_LABEL: Record<Priority, string> = { 1: 'P1', 2: 'P2', 3: 'P3' };
const PRIO_CLASS: Record<Priority, string> = {
  1: 'pri-1',
  2: 'pri-2',
  3: 'pri-3',
};

function formatMin(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}u ${rem}m` : `${h}u`;
}

export default function ShutdownModal({ open, onClose }: Props) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
  const { data: todayPlan } = useDailyPlan(todayStr);
  const upsert = useUpsertDailyPlan();
  const { data: allTodos = [] } = useTodos();
  const navigate = useNavigate();
  const showToast = useToasts((s) => s.showToast);

  const [reflection, setReflection] = useState('');
  const [letGo, setLetGo] = useState('');
  const [tomorrowTop3, setTomorrowTop3] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    if (open && todayPlan) {
      setReflection(todayPlan.shutdown_note ?? '');
      setTomorrowTop3(todayPlan.next_day_top3 ?? []);
      setRating(todayPlan.day_rating ?? null);
      setLetGo('');
    } else if (open) {
      setReflection('');
      setTomorrowTop3([]);
      setRating(null);
      setLetGo('');
    }
  }, [open, todayPlan?.id]);

  // Stats
  const completedToday = useMemo(
    () =>
      allTodos.filter(
        (t) => t.completed_at && isToday(parseISO(t.completed_at))
      ),
    [allTodos]
  );
  const doingCount = useMemo(
    () => allTodos.filter((t) => t.status === 'doing').length,
    [allTodos]
  );
  const focusMin = useMemo(
    () => completedToday.reduce((sum, t) => sum + (t.effort_min ?? 0), 0),
    [completedToday]
  );

  // All open todos as suggestions, sorted by priority then due_date
  // No slice — user wants to see ALL P1 todos. Grouped visually by priority.
  const suggestions = useMemo(
    () =>
      allTodos
        .filter((t) => t.status !== 'done' && !tomorrowTop3.includes(t.id))
        .sort(
          (a, b) =>
            a.priority - b.priority ||
            (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
        ),
    [allTodos, tomorrowTop3]
  );

  const picked = tomorrowTop3
    .map((id) => allTodos.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  if (!open) return null;

  function addToTomorrow(id: string) {
    if (tomorrowTop3.includes(id) || tomorrowTop3.length >= MAX) return;
    setTomorrowTop3([...tomorrowTop3, id]);
  }

  function removeFromTomorrow(id: string) {
    setTomorrowTop3(tomorrowTop3.filter((x) => x !== id));
  }

  async function commit() {
    const combinedReflection = [
      reflection.trim(),
      letGo.trim() ? `Laat los: ${letGo.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await upsert.mutateAsync({
        date: todayStr,
        shutdown_note: combinedReflection || null,
        next_day_top3: tomorrowTop3,
        day_rating: rating,
      });
      if (tomorrowTop3.length > 0) {
        await upsert.mutateAsync({
          date: tomorrowStr,
          top3_todo_ids: tomorrowTop3,
        });
      }
      showToast({
        message: tomorrowTop3.length > 0
          ? `Dag afgesloten · morgen begint met ${tomorrowTop3.length} top-${tomorrowTop3.length === 1 ? 'taak' : 'taken'}`
          : 'Dag afgesloten',
        durationMs: 3000,
      });
      onClose();
      navigate('/');
    } catch (err: any) {
      const msg = err?.message ?? 'Onbekende fout';
      showToast({
        message: `Opslaan mislukt: ${msg}`,
        durationMs: 6000,
      });
      // Don't close — let user retry
      console.error('[shutdown] upsert failed', err);
    }
  }

  return (
    <div className="sd-shroud" onClick={onClose}>
      <div className="sd" onClick={(e) => e.stopPropagation()}>
        <div className="sd-head">
          <div>
            <div className="qa-eyebrow">
              // shutdown · {format(today, 'EEEE d MMMM yyyy', { locale: nl })}
            </div>
            <h2 className="sd-title">Sluit de dag af</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Sluit">
            <X size={14} />
          </button>
        </div>

        <div className="sd-stats">
          <div className="sd-stat">
            <span className="tabular sd-num">{completedToday.length}</span>
            <span className="sd-l">afgewerkt</span>
          </div>
          <div className="sd-stat">
            <span className="tabular sd-num">{doingCount}</span>
            <span className="sd-l">in uitvoering</span>
          </div>
          <div className="sd-stat">
            <span className="tabular sd-num">
              {focusMin > 0 ? formatMin(focusMin) : '—'}
            </span>
            <span className="sd-l">gefocust</span>
          </div>
        </div>

        <div className="sd-q">
          <label>Hoe was je dag?</label>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '4px 0',
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`Rate ${n} of 5`}
                style={{
                  padding: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Star
                  size={22}
                  fill={rating !== null && n <= rating ? 'var(--accent)' : 'none'}
                  color={
                    rating !== null && n <= rating
                      ? 'var(--accent)'
                      : 'rgb(var(--muted))'
                  }
                />
              </button>
            ))}
            {rating !== null && (
              <span className="muted-text font-mono-tight" style={{ marginLeft: 4 }}>
                {rating}/5
              </span>
            )}
          </div>
        </div>

        <div className="sd-q">
          <label>Wat liep door vandaag?</label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Een gedachte, een spanning, een onafgemaakte taak..."
            rows={2}
          />
        </div>

        <div className="sd-q">
          <label>
            Wat is morgen het belangrijkste?{' '}
            <span className="muted-text font-mono-tight" style={{ marginLeft: 4 }}>
              {tomorrowTop3.length}/{MAX}
            </span>
          </label>

          {picked.length > 0 && (
            <div className="sd-suggestions" style={{ marginBottom: 8 }}>
              {picked.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => removeFromTomorrow(t.id)}
                  className="sd-sug"
                  style={{
                    background: 'var(--accent-soft)',
                    borderColor: 'rgb(var(--accent-rgb) / 0.4)',
                    color: 'var(--accent)',
                  }}
                  title="Verwijder uit morgen's Top 3"
                >
                  <span
                    className="tabular"
                    style={{ marginRight: 4, fontWeight: 600 }}
                  >
                    {i + 1}.
                  </span>
                  {t.title}
                  <X size={10} style={{ marginLeft: 4 }} />
                </button>
              ))}
            </div>
          )}

          {tomorrowTop3.length < MAX && (
            <>
              {suggestions.length === 0 ? (
                <p
                  className="muted-text"
                  style={{ fontSize: 12, fontStyle: 'italic' }}
                >
                  Geen open to-do's om uit te kiezen.
                </p>
              ) : (
                <PriorityGroupedSuggestions
                  todos={suggestions}
                  disabled={tomorrowTop3.length >= MAX}
                  onPick={addToTomorrow}
                />
              )}
            </>
          )}
        </div>

        <div className="sd-q">
          <label>Wat laat je los?</label>
          <textarea
            value={letGo}
            onChange={(e) => setLetGo(e.target.value)}
            placeholder="Iets dat je nu niet meer kan oplossen..."
            rows={2}
          />
        </div>

        <div className="sd-foot" style={{ justifyContent: 'space-between' }}>
          <Link
            to="/agenda"
            onClick={onClose}
            className="muted-text"
            style={{ fontSize: 12 }}
          >
            Open agenda →
          </Link>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onClose} className="btn btn-ghost">
              Later
            </button>
            <button
              onClick={commit}
              disabled={upsert.isPending}
              className="btn btn-primary"
            >
              <Moon size={13} /> Sluit af <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityGroupedSuggestions({
  todos,
  disabled,
  onPick,
}: {
  todos: { id: string; title: string; priority: Priority }[];
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  // Group by priority for visual scanning
  const byPrio: Record<Priority, typeof todos> = { 1: [], 2: [], 3: [] };
  for (const t of todos) byPrio[t.priority].push(t);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {([1, 2, 3] as Priority[]).map((prio) => {
        const items = byPrio[prio];
        if (items.length === 0) return null;
        return (
          <div key={prio} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span
              className={clsx('pri', PRIO_CLASS[prio])}
              style={{ marginTop: 5, flexShrink: 0 }}
            >
              {PRIO_LABEL[prio]}
            </span>
            <div className="sd-suggestions" style={{ flex: 1 }}>
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  disabled={disabled}
                  className="sd-sug"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
