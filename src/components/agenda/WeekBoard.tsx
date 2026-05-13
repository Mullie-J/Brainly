import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  addDays,
  format,
  isPast,
  isToday,
  parseISO,
  startOfWeek,
  isAfter,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Inbox,
  CalendarX,
  CalendarRange,
  Layers,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import { useUI } from '@/store/ui';
import PriorityBadge from '@/components/todo/PriorityBadge';
import type { Todo, Priority, Scope } from '@/lib/types';

type PoolKey = 'unscheduled' | 'overdue' | 'later';

export default function WeekBoard() {
  const { data: allTodos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const update = useUpdateTodo();

  const [weekOffset, setWeekOffset] = useState(0);   // 0 = this week, -1 = previous, etc.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [poolTab, setPoolTab] = useState<PoolKey>('unscheduled');

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const weekStart = useMemo(() => {
    const base = addDays(new Date(), weekOffset * 7);
    return startOfWeek(base, { weekStartsOn: 1 });
  }, [weekOffset]);
  // Werk = Mon-Fri (weekend is "Later"). Privé = Mon-Sun (weekend telt voor privé).
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const workDays = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const d = addDays(weekStart, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        return {
          date: d,
          dateStr,
          todos: allTodos
            .filter(
              (t) =>
                t.due_date === dateStr &&
                t.status !== 'done' &&
                t.scope !== 'personal'
            )
            .sort((a, b) => a.priority - b.priority),
        };
      }),
    [weekStart, allTodos]
  );

  const personalDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        return {
          date: d,
          dateStr,
          todos: allTodos
            .filter(
              (t) =>
                t.due_date === dateStr &&
                t.status !== 'done' &&
                t.scope === 'personal'
            )
            .sort((a, b) => a.priority - b.priority),
        };
      }),
    [weekStart, allTodos]
  );

  // Pools: open todos that aren't scheduled within this week
  const pools = useMemo(() => {
    const open = allTodos.filter((t) => t.status !== 'done');
    const unscheduled = open
      .filter((t) => !t.due_date)
      .sort((a, b) => a.priority - b.priority);
    const overdue = open
      .filter((t) => {
        if (!t.due_date) return false;
        const d = parseISO(t.due_date);
        return isPast(d) && !isToday(d) && d < weekStart;
      })
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
    const later = open
      .filter((t) => {
        if (!t.due_date) return false;
        const d = parseISO(t.due_date);
        return isAfter(d, weekEnd);
      })
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
    return { unscheduled, overdue, later };
  }, [allTodos, weekStart, weekEnd]);

  const activeTodo = activeId
    ? allTodos.find((t) => t.id === activeId.replace(/^todo:/, ''))
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 4 } })
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const todoId = String(active.id).replace(/^todo:/, '');
    const todo = allTodos.find((t) => t.id === todoId);
    if (!todo) return;

    const overId = String(over.id);
    // Format: "day:<scope>:<yyyy-MM-dd>" — droppen op een dag zet datum én
    // (eventueel) scope, zodat slepen tussen Werk en Privé direct werkt.
    if (overId.startsWith('day:')) {
      const [, scopeStr, dateStr] = overId.split(':');
      const targetScope = scopeStr as Scope;
      const patch: any = {};
      if (todo.due_date !== dateStr) {
        patch.due_date = dateStr;
        patch.start_time = null;
        patch.duration_min = null;
      }
      if (todo.scope !== targetScope) {
        patch.scope = targetScope;
      }
      if (Object.keys(patch).length > 0) {
        update.mutate({ id: todoId, patch });
      }
    } else if (overId === 'pool') {
      if (todo.due_date) {
        update.mutate({
          id: todoId,
          patch: { due_date: null, start_time: null, duration_min: null },
        });
      }
    }
  }

  const POOLS: { id: PoolKey; label: string; icon: typeof Inbox; items: Todo[]; color: string }[] = [
    {
      id: 'unscheduled',
      label: 'Ongepland',
      icon: Inbox,
      items: pools.unscheduled,
      color: 'text-muted',
    },
    {
      id: 'overdue',
      label: 'Overtijd',
      icon: CalendarX,
      items: pools.overdue,
      color: 'text-red-500',
    },
    {
      id: 'later',
      label: 'Later',
      icon: CalendarRange,
      items: pools.later,
      color: 'text-muted',
    },
  ];
  const activePool = POOLS.find((p) => p.id === poolTab)!;

  const weekLabel =
    weekOffset === 0
      ? 'Deze week'
      : weekOffset === 1
      ? 'Volgende week'
      : weekOffset === -1
      ? 'Vorige week'
      : `${format(weekStart, 'd MMM', { locale: nl })} – ${format(weekEnd, 'd MMM yyyy', { locale: nl })}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="wkplanner" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="wkp-pool-head">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="wkp-nav"
          aria-label="Vorige week"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="wkp-range">
          <span className="wkp-range-l">{weekLabel}</span>
          <span className="muted-text font-mono-tight">
            {format(weekStart, 'd MMM', { locale: nl })} –{' '}
            {format(weekEnd, 'd MMM', { locale: nl })}
          </span>
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="wkp-nav"
          aria-label="Volgende week"
        >
          <ChevronRight size={14} />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="btn btn-ghost"
            style={{ marginLeft: 'auto' }}
          >
            Deze week
          </button>
        )}
      </div>

      {/* Pool */}
      <Pool
        pools={POOLS}
        activeId={poolTab}
        onTabChange={setPoolTab}
        active={activePool}
        projectMap={projectMap}
      />

      <section className="wkp-scope">
        <div className="wkp-scope-head">
          <span className="wkp-scope-l">
            <span className="wkp-scope-icon">💼</span> Werk
          </span>
          <span className="muted-text wkp-scope-sub">ma – vr</span>
        </div>
        <div className="wkp-row wkp-row-5">
          {workDays.map((day) => (
            <DayColumn
              key={`work-${day.dateStr}`}
              scope="work"
              date={day.date}
              dateStr={day.dateStr}
              todos={day.todos}
              projectMap={projectMap}
              onToggle={(id, status) =>
                update.mutate({
                  id,
                  patch: { status: status === 'done' ? 'todo' : 'done' },
                })
              }
              onPriority={(id, p) =>
                update.mutate({ id, patch: { priority: p } })
              }
            />
          ))}
        </div>
      </section>

      <section className="wkp-scope">
        <div className="wkp-scope-head">
          <span className="wkp-scope-l">
            <span className="wkp-scope-icon">🏡</span> Privé
          </span>
          <span className="muted-text wkp-scope-sub">ma – zo</span>
        </div>
        <div className="wkp-row wkp-row-7">
          {personalDays.map((day) => (
            <DayColumn
              key={`personal-${day.dateStr}`}
              scope="personal"
              date={day.date}
              dateStr={day.dateStr}
              todos={day.todos}
              projectMap={projectMap}
              onToggle={(id, status) =>
                update.mutate({
                  id,
                  patch: { status: status === 'done' ? 'todo' : 'done' },
                })
              }
              onPriority={(id, p) =>
                update.mutate({ id, patch: { priority: p } })
              }
            />
          ))}
        </div>
      </section>

      <p className="wkp-hint">
        Sleep een kaartje uit de pool naar een dag. Sleep tussen werk en privé
        om scope te wisselen. Sleep terug naar de pool om datum te wissen.
      </p>
      </div>

      <DragOverlay>
        {activeTodo ? (
          <Card
            todo={activeTodo}
            project={
              activeTodo.project_id ? projectMap.get(activeTodo.project_id) : null
            }
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Pool({
  pools,
  activeId,
  onTabChange,
  active,
  projectMap,
}: {
  pools: { id: PoolKey; label: string; icon: typeof Inbox; items: Todo[]; color: string }[];
  activeId: PoolKey;
  onTabChange: (id: PoolKey) => void;
  active: { id: PoolKey; items: Todo[] };
  projectMap: Map<string, any>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });

  return (
    <div ref={setNodeRef} className={clsx('wkp-pool', isOver && 'over')}>
      <div className="wkp-pool-tabs">
        {pools.map((p) => {
          const Icon = p.icon;
          const isActive = activeId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onTabChange(p.id)}
              className={clsx('wkp-pool-tab', isActive && 'on')}
            >
              <Icon size={12} />
              <span>{p.label}</span>
              <span className="wkp-pool-count tabular">{p.items.length}</span>
            </button>
          );
        })}
        <Link to="/todos" className="wkp-pool-all">
          <Layers size={11} /> Alle to-do's
        </Link>
      </div>

      <div className="wkp-pool-grid">
        {active.items.length === 0 ? (
          <div className="wkp-pool-empty">
            {active.id === 'unscheduled' && 'Niets ongepland 🎯'}
            {active.id === 'overdue' && 'Niets overtijd 🎯'}
            {active.id === 'later' && 'Niets gepland voor later.'}
          </div>
        ) : (
          active.items.map((t) => (
            <Card
              key={t.id}
              todo={t}
              project={t.project_id ? projectMap.get(t.project_id) : null}
              compact
            />
          ))
        )}
      </div>
    </div>
  );
}

function DayColumn({
  scope,
  date,
  dateStr,
  todos,
  projectMap,
  onToggle,
  onPriority,
}: {
  scope: Scope;
  date: Date;
  dateStr: string;
  todos: Todo[];
  projectMap: Map<string, any>;
  onToggle: (id: string, status: Todo['status']) => void;
  onPriority: (id: string, p: Priority) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${scope}:${dateStr}` });
  const today = isToday(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'wkp-day',
        today && 'tdy',
        isOver && 'over'
      )}
      style={
        scope === 'personal' && isWeekend && !today
          ? { background: 'rgb(var(--surface-2) / 0.4)' }
          : undefined
      }
    >
      <div className="wkp-day-head">
        <span className="font-mono-tight muted-text">
          {format(date, 'EEE', { locale: nl })}
        </span>
        <span className="tabular" style={{ fontSize: 14, fontWeight: 500 }}>
          {format(date, 'd')}
        </span>
        {todos.length > 0 && (
          <span className="wkp-pool-count tabular" style={{ marginLeft: 'auto' }}>
            {todos.length}
          </span>
        )}
      </div>
      <div className="wkp-day-body">
        {todos.length === 0 ? (
          <div className="wkp-day-empty">Leeg</div>
        ) : (
          todos.map((t) => (
            <Card
              key={t.id}
              todo={t}
              project={t.project_id ? projectMap.get(t.project_id) : null}
              onToggle={() => onToggle(t.id, t.status)}
              onPriority={(p) => onPriority(t.id, p)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Card({
  todo,
  project,
  compact,
  dragging,
  onToggle,
  onPriority,
}: {
  todo: Todo;
  project: any;
  compact?: boolean;
  dragging?: boolean;
  onToggle?: () => void;
  onPriority?: (p: Priority) => void;
}) {
  const openTodo = useUI((s) => s.openTodo);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `todo:${todo.id}` });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  const overdue =
    todo.due_date && isPast(parseISO(todo.due_date)) && !isToday(parseISO(todo.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        compact ? 'wkp-card' : 'wkp-day-card',
        dragging && 'dragging'
      )}
    >
      <div className={compact ? 'wkp-card-meta' : 'wkp-day-card-top'} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {onToggle && (
          <button
            onClick={onToggle}
            onPointerDown={(e) => e.stopPropagation()}
            className="check"
            aria-label="Toggle done"
            style={{ marginTop: 1 }}
          >
            {todo.status === 'done' ? (
              <CheckCircle2 size={12} />
            ) : (
              <Circle size={12} />
            )}
          </button>
        )}
        <div
          {...attributes}
          {...listeners}
          onClick={() => {
            if (!isDragging) openTodo(todo.id);
          }}
          style={{ flex: 1, minWidth: 0, cursor: 'grab' }}
        >
          <div className={clsx(compact ? 'wkp-card-title' : 'wkp-day-card-title', todo.status === 'done' && 'strike')}>
            {todo.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
            <PriorityBadge
              priority={todo.priority}
              onChange={onPriority}
              size="xs"
            />
            {compact && todo.due_date && (
              <span
                className={clsx(
                  overdue ? 'chip chip-overdue' : 'muted-text'
                )}
                style={{ fontSize: 10 }}
              >
                {format(parseISO(todo.due_date), 'd MMM')}
              </span>
            )}
            {project && (
              <span className="proj-chip" style={{ maxWidth: 100 }}>
                <span className="proj-swatch" style={{ background: 'var(--accent)' }} />
                <span className="proj-chip-label">{project.title}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
