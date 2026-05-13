import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, X, ArrowRight } from 'lucide-react';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useDailyPlan, useUpsertDailyPlan } from '@/hooks/useDailyPlan';
import { useTodos } from '@/hooks/useTodos';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX = 3;

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

  const [reflection, setReflection] = useState('');
  const [letGo, setLetGo] = useState('');
  const [tomorrowTop3, setTomorrowTop3] = useState<string[]>([]);

  useEffect(() => {
    if (open && todayPlan) {
      setReflection(todayPlan.shutdown_note ?? '');
      setTomorrowTop3(todayPlan.next_day_top3 ?? []);
      setLetGo('');
    } else if (open) {
      setReflection('');
      setTomorrowTop3([]);
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

  // Suggestions: open todos sorted by priority, max 8 for the pill list
  const suggestions = useMemo(
    () =>
      allTodos
        .filter((t) => t.status !== 'done' && !tomorrowTop3.includes(t.id))
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 8),
    [allTodos, tomorrowTop3]
  );

  // Currently picked tomorrow todos (resolved to full Todo objects)
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
    const combinedReflection = [reflection.trim(), letGo.trim() ? `\nLaat los: ${letGo.trim()}` : '']
      .filter(Boolean)
      .join('');
    await upsert.mutateAsync({
      date: todayStr,
      shutdown_note: combinedReflection || null,
      next_day_top3: tomorrowTop3,
    });
    if (tomorrowTop3.length > 0) {
      await upsert.mutateAsync({
        date: tomorrowStr,
        top3_todo_ids: tomorrowTop3,
      });
    }
    onClose();
    navigate('/');
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
          <label>Wat liep door vandaag?</label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Een gedachte, een spanning, een onafgemaakte taak..."
            rows={2}
          />
        </div>

        <div className="sd-q">
          <label>Wat is morgen het belangrijkste?</label>
          {picked.length > 0 && (
            <div className="sd-suggestions" style={{ marginBottom: 6 }}>
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
                  <span className="tabular" style={{ marginRight: 4, fontWeight: 600 }}>
                    {i + 1}.
                  </span>
                  {t.title}
                  <X size={10} style={{ marginLeft: 4 }} />
                </button>
              ))}
            </div>
          )}
          {picked.length < MAX && (
            <div className="sd-suggestions">
              {suggestions.length === 0 ? (
                <p className="muted-text" style={{ fontSize: 12, fontStyle: 'italic' }}>
                  Geen open to-do's om uit te kiezen.
                </p>
              ) : (
                suggestions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addToTomorrow(t.id)}
                    disabled={tomorrowTop3.length >= MAX}
                    className={clsx('sd-sug')}
                  >
                    {t.title}
                  </button>
                ))
              )}
            </div>
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
          <Link to="/agenda" onClick={onClose} className="muted-text" style={{ fontSize: 12 }}>
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
