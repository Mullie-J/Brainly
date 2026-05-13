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
      {/* Week navigator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-1.5 rounded-md hover:bg-surface2 text-muted hover:text-text"
            aria-label="Vorige week"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="text-sm font-medium tracking-tight">
            {weekLabel}
            <span className="ml-2 text-xs text-muted font-normal">
              {format(weekStart, 'd MMM', { locale: nl })} –{' '}
              {format(weekEnd, 'd MMM', { locale: nl })}
            </span>
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-1.5 rounded-md hover:bg-surface2 text-muted hover:text-text"
            aria-label="Volgende week"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs text-accent hover:underline"
          >
            Terug naar deze week
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

      {/* Werk: Mon-Fri */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="text-xs uppercase tracking-wider text-muted font-medium">
            💼 Werk
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
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
      </div>

      {/* Privé: Mon-Sun */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="text-xs uppercase tracking-wider text-muted font-medium">
            🏡 Privé
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
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
      </div>

      <p className="mt-4 text-[11px] text-muted italic">
        Sleep een kaartje uit de pool naar een dag. Sleep tussen werk en privé
        om scope te wisselen. Sleep terug naar de pool om datum te wissen.
      </p>

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
    <div
      ref={setNodeRef}
      className={clsx(
        'mb-3 rounded-lg border transition-colors',
        isOver ? 'border-accent bg-accent/5' : 'border-border bg-surface2/30'
      )}
    >
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-2">
        {pools.map((p) => {
          const Icon = p.icon;
          const isActive = activeId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onTabChange(p.id)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              )}
            >
              <Icon size={12} className={isActive ? p.color : ''} />
              <span>{p.label}</span>
              <span className="text-[10px] tabular-nums opacity-70">
                {p.items.length}
              </span>
            </button>
          );
        })}
        <Link
          to="/todos"
          className="ml-auto text-[11px] text-muted hover:text-text inline-flex items-center gap-1 pr-2"
        >
          <Layers size={11} /> Alle to-do's →
        </Link>
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-wrap gap-1.5 min-h-[60px]">
        {active.items.length === 0 ? (
          <p className="text-xs text-muted italic px-2 py-2">
            {active.id === 'unscheduled' && 'Niets ongepland 🎯'}
            {active.id === 'overdue' && 'Niets overtijd 🎯'}
            {active.id === 'later' && 'Niets gepland voor later.'}
          </p>
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
        'rounded-lg border bg-surface flex flex-col min-h-[180px] transition-colors',
        today ? 'border-accent/40' : 'border-border',
        isOver && 'bg-accent/10 border-accent',
        scope === 'personal' && isWeekend && !today && 'bg-surface2/30'
      )}
    >
      <div
        className={clsx(
          'px-2.5 py-1.5 border-b text-xs font-medium flex items-center justify-between',
          today
            ? 'border-accent/30 bg-accent/5 text-accent'
            : 'border-border text-muted'
        )}
      >
        <span>
          <span className="uppercase tracking-wider">
            {format(date, 'EEE', { locale: nl })}
          </span>
          <span className="ml-1.5 tabular-nums normal-case">
            {format(date, 'd')}
          </span>
        </span>
        {todos.length > 0 && (
          <span className="text-[10px] tabular-nums opacity-60">
            {todos.length}
          </span>
        )}
      </div>
      <div className="p-1.5 flex flex-col gap-1 flex-1">
        {todos.length === 0 ? (
          <div className="text-[10px] text-muted italic text-center py-3">
            Leeg
          </div>
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
        'group rounded-md border text-xs touch-none relative',
        compact
          ? 'bg-surface border-border px-2 py-1.5 max-w-[220px]'
          : 'bg-surface border-border px-2 py-1.5',
        dragging && 'shadow-lg rotate-1 ring-2 ring-accent/40',
        'hover:border-accent/40 transition-colors'
      )}
    >
      {/* Scope indicator stripe (left edge) */}
      <span
        className={clsx(
          'absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r',
          todo.scope === 'personal' ? 'bg-emerald-500/70' : 'bg-accent/40'
        )}
      />
      <div className="flex items-start gap-1.5">
        {onToggle && (
          <button
            onClick={onToggle}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-0.5 shrink-0 text-muted hover:text-accent"
            aria-label="Toggle done"
          >
            {todo.status === 'done' ? (
              <CheckCircle2 size={12} className="text-accent" />
            ) : (
              <Circle size={12} />
            )}
          </button>
        )}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => {
            // Only treat as click (open) if no drag occurred
            if (!isDragging) openTodo(todo.id);
          }}
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          <div
            className={clsx(
              'truncate font-medium',
              todo.status === 'done' && 'line-through text-muted'
            )}
          >
            {todo.title}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <PriorityBadge
              priority={todo.priority}
              onChange={onPriority}
              size="xs"
            />
            {compact && todo.due_date && (
              <span
                className={clsx(
                  'text-[9px]',
                  overdue ? 'text-red-500' : 'text-muted'
                )}
              >
                {format(parseISO(todo.due_date), 'd MMM')}
              </span>
            )}
            {project && (
              <span className="text-[9px] text-muted truncate">
                {project.title}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
