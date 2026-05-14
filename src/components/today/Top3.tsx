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

  // Read as sparse: length 3 with nulls where empty.
  // Legacy packed arrays (string[]) still load correctly — they just don't
  // preserve slot positions, but new writes will be sparse from now on.
  const slots = useMemo<(string | null)[]>(() => {
    const raw = plan?.top3_todo_ids ?? [];
    const out: (string | null)[] = [null, null, null];
    for (let i = 0; i < Math.min(raw.length, MAX_TOP3); i++) {
      out[i] = raw[i] ?? null;
    }
    return out;
  }, [plan?.top3_todo_ids]);

  const topIdsFilled = slots.filter((x): x is string => !!x);

  const todoMap = useMemo(
    () => new Map(allTodos.map((t) => [t.id, t])),
    [allTodos]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Resolved per-slot todos (null when slot empty)
  const slotTodos: (Todo | null)[] = slots.map((id) =>
    id ? todoMap.get(id) ?? null : null
  );

  const pickable = allTodos.filter(
    (t) => t.status !== 'done' && !topIdsFilled.includes(t.id)
  );

  const filledTodos = slotTodos.filter((t): t is Todo => !!t);
  const completed = filledTodos.filter((t) => t.status === 'done').length;
  const fullyDone = filledTodos.length > 0 && completed === filledTodos.length;

  const [dragOver, setDragOver] = useState<number | null>(null);

  function persistSlots(next: (string | null)[]) {
    // Trim trailing nulls so we don't bloat storage but keep internal nulls
    let end = next.length;
    while (end > 0 && next[end - 1] === null) end--;
    upsert.mutate({ date: dateStr, top3_todo_ids: next.slice(0, end) });
  }

  function add(id: string) {
    // Find first empty slot
    const next = [...slots];
    const empty = next.indexOf(null);
    if (empty === -1) return;
    next[empty] = id;
    persistSlots(next);
  }

  function remove(id: string) {
    persistSlots(slots.map((x) => (x === id ? null : x)));
  }

  // Place an id at a specific slot index. Sparse: empty slots stay empty,
  // filled slots get replaced. Dedupes if id was elsewhere.
  function setAtIndex(idx: number, id: string) {
    if (idx < 0 || idx >= MAX_TOP3) return;
    const next: (string | null)[] = slots.map((x) => (x === id ? null : x));
    next[idx] = id;
    persistSlots(next);
  }

  function onSlotDragOver(idx: number) {
    return (e: React.DragEvent) => {
      // Only accept text/plain drops (our todos set this)
      if (!e.dataTransfer.types.includes('text/plain')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(idx);
    };
  }

  function onSlotDrop(idx: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      setDragOver(null);
      if (!id) return;
      if (!allTodos.some((t) => t.id === id)) return;
      setAtIndex(idx, id);
    };
  }

  function onSectionDragLeave(e: React.DragEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
  }

  return (
    <section
      className={clsx(
        'top3',
        fullyDone && 'top3-done',
        dragOver !== null && 'top3-drag'
      )}
      onDragLeave={onSectionDragLeave}
    >
      <div className="top3-head">
        <div className="top3-title">
          <Target size={16} />
          <span className="top3-h">Vandaag's Top 3</span>
          <span className="top3-progress">
            <span className="tabular">{completed}</span>
            <span className="muted-text"> / {filledTodos.length || MAX_TOP3}</span>
          </span>
        </div>
        <div className="top3-head-r">
          <div className="top3-dots">
            {slotTodos.map((t, i) => {
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
        {slotTodos.map((t, i) => {
          const isOver = dragOver === i;
          if (!t) {
            return (
              <button
                key={`empty-${i}`}
                onClick={() => setPicking(true)}
                onDragOver={onSlotDragOver(i)}
                onDrop={onSlotDrop(i)}
                disabled={pickable.length === 0}
                className={clsx(
                  'top3-slot top3-empty',
                  isOver && 'top3-slot-over'
                )}
              >
                <span className="top3-num">{i + 1}</span>
                <span className="top3-empty-label">
                  {isOver ? (
                    <>Laat hier los om te kiezen</>
                  ) : (
                    <>
                      <Plus size={13} /> <span>Kies #{i + 1}</span>
                    </>
                  )}
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
              isOver={isOver}
              onToggle={() =>
                updateTodo.mutate({
                  id: t.id,
                  patch: { status: t.status === 'done' ? 'todo' : 'done' },
                })
              }
              onRemove={() => remove(t.id)}
              onDragOver={onSlotDragOver(i)}
              onDrop={onSlotDrop(i)}
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
                    disabled={topIdsFilled.length >= MAX_TOP3}
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
  isOver,
  onToggle,
  onRemove,
  onDragOver,
  onDrop,
}: {
  todo: Todo;
  index: number;
  project: any;
  isOver?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const { contextMenuProps, menu } = useTodoContextMenu(t);
  return (
    <>
      <div
        className={clsx(
          'top3-slot',
          t.status === 'done' && 'top3-slot-done',
          isOver && 'top3-slot-over'
        )}
        onDragOver={onDragOver}
        onDrop={onDrop}
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
