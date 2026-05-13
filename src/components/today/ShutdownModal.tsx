import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Moon,
  X,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import { useDailyPlan, useUpsertDailyPlan } from '@/hooks/useDailyPlan';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX = 3;

export default function ShutdownModal({ open, onClose }: Props) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
  const { data: todayPlan } = useDailyPlan(todayStr);
  const upsert = useUpsertDailyPlan();
  const { data: allTodos = [] } = useTodos();
  const updateTodo = useUpdateTodo();
  const navigate = useNavigate();

  const [reflection, setReflection] = useState('');
  const [tomorrowTop3, setTomorrowTop3] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (open && todayPlan) {
      setReflection(todayPlan.shutdown_note ?? '');
      setTomorrowTop3(todayPlan.next_day_top3 ?? []);
    } else if (open) {
      setReflection('');
      setTomorrowTop3([]);
    }
  }, [open, todayPlan?.id]);

  if (!open) return null;

  const todayTop3Todos = (todayPlan?.top3_todo_ids ?? [])
    .map((id) => allTodos.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const pickable = allTodos.filter(
    (t) => t.status !== 'done' && !tomorrowTop3.includes(t.id)
  );

  async function commit() {
    await upsert.mutateAsync({
      date: todayStr,
      shutdown_note: reflection.trim() || null,
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
            <div className="qa-eyebrow">// shutdown · {format(today, 'd MMM')}</div>
            <h2 className="sd-title">Sluit de dag af</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Sluit">
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <section>
            <h3 className="section-title">Vandaag's Top 3 — terugblik</h3>
            {todayTop3Todos.length === 0 ? (
              <p className="text-sm text-muted italic">
                Geen Top 3 ingevuld vandaag.
              </p>
            ) : (
              <div className="space-y-1.5">
                {todayTop3Todos.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 text-sm px-3 py-2 bg-surface2/40 rounded-md"
                  >
                    <button
                      onClick={() =>
                        updateTodo.mutate({
                          id: t.id,
                          patch: { status: t.status === 'done' ? 'todo' : 'done' },
                        })
                      }
                      className="shrink-0"
                    >
                      {t.status === 'done' ? (
                        <CheckCircle2 size={15} className="text-accent" />
                      ) : (
                        <Circle size={15} className="text-muted" />
                      )}
                    </button>
                    <span className="text-[10px] text-muted shrink-0">
                      #{i + 1}
                    </span>
                    <span
                      className={
                        t.status === 'done' ? 'line-through text-muted' : ''
                      }
                    >
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sd-q">
            <label>Wat ging goed · wat houdt je morgen vast?</label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="2 zinnen is genoeg."
              rows={3}
            />
          </section>

          <section>
            <h3 className="section-title">Morgen — kies je Top 3</h3>
            <div className="space-y-1.5">
              {Array.from({ length: MAX }).map((_, i) => {
                const id = tomorrowTop3[i];
                const t = id ? allTodos.find((x) => x.id === id) : null;
                if (!t) {
                  return (
                    <button
                      key={i}
                      onClick={() => setPicking(true)}
                      disabled={pickable.length === 0}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted hover:text-text hover:border-accent/50 transition-colors disabled:opacity-50"
                    >
                      <span className="w-5 h-5 rounded-full border border-dashed border-muted flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <Plus size={13} />
                      <span>Kies #{i + 1}</span>
                    </button>
                  );
                }
                return (
                  <div
                    key={t.id}
                    className="group flex items-center gap-3 px-3 py-2 bg-surface border border-border rounded-md text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <button
                      onClick={() =>
                        setTomorrowTop3(tomorrowTop3.filter((x) => x !== t.id))
                      }
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500"
                      aria-label="Verwijder"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

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
                <Moon size={13} /> Sluit dag af <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Picker */}
      {picking && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 flex items-start justify-center pt-24 px-4"
          onClick={() => setPicking(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface rounded-xl border border-border shadow-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Kies een to-do voor morgen</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto py-1">
              {pickable.length === 0 && (
                <p className="text-sm text-muted px-4 py-3">Geen open to-do's.</p>
              )}
              {pickable.slice(0, 50).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTomorrowTop3([...tomorrowTop3, t.id].slice(0, MAX));
                    setPicking(false);
                  }}
                  disabled={tomorrowTop3.length >= MAX}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface2 transition-colors text-left disabled:opacity-50"
                >
                  <GripVertical size={13} className="text-muted shrink-0" />
                  <span className="flex-1 truncate">{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
