import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Plus,
  X,
  Target,
  GripVertical,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import type { Todo } from '@/lib/types';
import { useDailyPlan, useUpsertDailyPlan } from '@/hooks/useDailyPlan';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import PriorityBadge from '@/components/todo/PriorityBadge';

const MAX_TOP3 = 3;

export default function Top3({ date }: { date: Date }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data: plan } = useDailyPlan(dateStr);
  const upsert = useUpsertDailyPlan();
  const { data: allTodos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const updateTodo = useUpdateTodo();
  const [picking, setPicking] = useState(false);

  const topIds = plan?.top3_todo_ids ?? [];
  const todoMap = useMemo(
    () => new Map(allTodos.map((t) => [t.id, t])),
    [allTodos]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const top3: Todo[] = topIds
    .map((id) => todoMap.get(id))
    .filter((t): t is Todo => !!t);

  const pickable = allTodos.filter(
    (t) => t.status !== 'done' && !topIds.includes(t.id)
  );

  const completed = top3.filter((t) => t.status === 'done').length;
  const fullyDone = top3.length > 0 && completed === top3.length;

  function setTop3(ids: string[]) {
    upsert.mutate({ date: dateStr, top3_todo_ids: ids });
  }

  function add(id: string) {
    if (topIds.length >= MAX_TOP3) return;
    setTop3([...topIds, id]);
  }

  function remove(id: string) {
    setTop3(topIds.filter((x) => x !== id));
  }

  return (
    <section
      className={clsx(
        'mb-8 rounded-xl border p-4 md:p-5 transition-colors',
        fullyDone
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-accent/30 bg-accent/5'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className={fullyDone ? 'text-emerald-600' : 'text-accent'} />
          <h2 className="text-sm font-semibold tracking-tight">
            Today's Top 3
          </h2>
          <span className="text-[11px] text-muted tabular-nums">
            {completed}/{top3.length || MAX_TOP3}
          </span>
        </div>
        {fullyDone && (
          <span className="text-xs text-emerald-600 font-medium">Klaar 🎯</span>
        )}
      </div>

      <p className="text-xs text-muted mb-3 italic">
        Maximaal 3 taken die — als je niets anders zou doen vandaag — het verschil maken.
      </p>

      {/* Slots */}
      <div className="space-y-1.5 mb-3">
        {Array.from({ length: MAX_TOP3 }).map((_, i) => {
          const t = top3[i];
          if (!t) {
            return (
              <button
                key={i}
                onClick={() => setPicking(true)}
                disabled={pickable.length === 0}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-border text-sm text-muted hover:text-text hover:border-accent/50 transition-colors disabled:opacity-50"
              >
                <span className="w-5 h-5 rounded-full border border-dashed border-muted flex items-center justify-center text-[10px]">
                  {i + 1}
                </span>
                <Plus size={14} />
                <span>Kies #{i + 1}</span>
              </button>
            );
          }
          const project = t.project_id ? projectMap.get(t.project_id) : null;
          return (
            <div
              key={t.id}
              className="group flex items-start gap-3 px-3 py-2.5 bg-surface border border-border rounded-md text-sm hover:border-accent/40 transition-colors"
            >
              <button
                onClick={() =>
                  updateTodo.mutate({
                    id: t.id,
                    patch: { status: t.status === 'done' ? 'todo' : 'done' },
                  })
                }
                className="mt-0.5 shrink-0 text-muted hover:text-accent"
              >
                {t.status === 'done' ? (
                  <CheckCircle2 size={16} className="text-accent" />
                ) : (
                  <Circle size={16} />
                )}
              </button>
              <span className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={clsx(
                    t.status === 'done' && 'line-through text-muted'
                  )}
                >
                  {t.title}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <PriorityBadge priority={t.priority} />
                  {project && (
                    <Link
                      to={`/p/${project.id}`}
                      className="text-[10px] text-muted hover:text-accent truncate"
                    >
                      {project.title}
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 p-1"
                aria-label="Verwijder uit Top 3"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Picker modal */}
      {picking && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-24 px-4"
          onClick={() => setPicking(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-surface rounded-xl border border-border shadow-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Voeg toe aan Today's Top 3
              </h3>
              <button
                onClick={() => setPicking(false)}
                className="text-muted hover:text-text p-1"
                aria-label="Sluit"
              >
                <X size={14} />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto py-1">
              {pickable.length === 0 && (
                <p className="text-sm text-muted px-4 py-3">
                  Geen open to-do's. Maak er eerst een aan.
                </p>
              )}
              {pickable.slice(0, 50).map((t) => {
                const project = t.project_id ? projectMap.get(t.project_id) : null;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      add(t.id);
                      setPicking(false);
                    }}
                    disabled={topIds.length >= MAX_TOP3}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface2 transition-colors text-left disabled:opacity-50"
                  >
                    <GripVertical size={13} className="text-muted shrink-0" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <PriorityBadge priority={t.priority} />
                    {project && (
                      <span className="text-[10px] text-muted truncate max-w-[100px]">
                        {project.title}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
