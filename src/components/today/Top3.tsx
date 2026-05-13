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
import { useTodoContextMenu } from '@/hooks/useTodoContextMenu';
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
    <section className={clsx('top3', fullyDone && 'top3-done')}>
      <div className="top3-head">
        <div className="top3-title">
          <Target size={16} />
          <span className="top3-h">Vandaag's Top 3</span>
          <span className="top3-progress">
            <span className="tabular">{completed}</span>
            <span className="muted-text"> / {top3.length || MAX_TOP3}</span>
          </span>
        </div>
        <div className="top3-head-r">
          <div className="top3-dots">
            {Array.from({ length: MAX_TOP3 }).map((_, i) => {
              const t = top3[i];
              const cls = !t ? '' : t.status === 'done' ? 'd-done' : 'd-pending';
              return <span key={i} className={clsx('top3-dot', cls)} />;
            })}
          </div>
        </div>
      </div>

      <p className="top3-quote">
        Maximaal 3 taken die — als je niets anders zou doen vandaag — het verschil maken.
      </p>

      <div className="top3-slots">
        {Array.from({ length: MAX_TOP3 }).map((_, i) => {
          const t = top3[i];
          if (!t) {
            return (
              <button
                key={i}
                onClick={() => setPicking(true)}
                disabled={pickable.length === 0}
                className="top3-slot top3-empty"
              >
                <span className="top3-num">{i + 1}</span>
                <span className="top3-empty-label">
                  <Plus size={13} /> <span>Kies #{i + 1}</span>
                </span>
              </button>
            );
          }
          const project = t.project_id ? projectMap.get(t.project_id) : null;
          return (
            <Top3Slot
              key={t.id}
              todo={t}
              index={i}
              project={project}
              onToggle={() =>
                updateTodo.mutate({
                  id: t.id,
                  patch: { status: t.status === 'done' ? 'todo' : 'done' },
                })
              }
              onRemove={() => remove(t.id)}
            />
          );
        })}
      </div>

      {picking && (
        <div
          className="palette-shroud"
          onClick={() => setPicking(false)}
        >
          <div
            className="palette"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="palette-input">
              <span style={{ fontWeight: 600, flex: 1 }}>
                Voeg toe aan Today's Top 3
              </span>
              <button
                onClick={() => setPicking(false)}
                className="btn btn-ghost"
                aria-label="Sluit"
              >
                <X size={14} />
              </button>
            </div>
            <div className="palette-list">
              {pickable.length === 0 && (
                <p className="palette-empty">
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
                    className="palette-item"
                  >
                    <GripVertical size={13} className="palette-icon" />
                    <span className="palette-label">{t.title}</span>
                    <PriorityBadge priority={t.priority} />
                    {project && (
                      <span className="palette-hint" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

function Top3Slot({
  todo: t,
  index,
  project,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  index: number;
  project: any;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { contextMenuProps, menu } = useTodoContextMenu(t);
  return (
    <>
      <div
        className={clsx('top3-slot', t.status === 'done' && 'top3-slot-done')}
        {...contextMenuProps}
      >
        <button onClick={onToggle} className="check" aria-label="Toggle">
          {t.status === 'done' ? (
            <CheckCircle2 size={17} />
          ) : (
            <Circle size={17} />
          )}
        </button>
        <span className="top3-num filled">{index + 1}</span>
        <div className="top3-body">
          <span
            className={clsx('top3-title-text', t.status === 'done' && 'strike')}
          >
            {t.title}
          </span>
          <span className="row-meta">
            <PriorityBadge priority={t.priority} />
            {project && (
              <Link to={`/p/${project.id}`} className="proj-chip">
                <span
                  className="proj-swatch"
                  style={{ background: 'var(--accent)' }}
                />
                <span className="proj-chip-label">{project.title}</span>
              </Link>
            )}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="top3-remove"
          aria-label="Verwijder uit Top 3"
        >
          <X size={13} />
        </button>
      </div>
      {menu}
    </>
  );
}
