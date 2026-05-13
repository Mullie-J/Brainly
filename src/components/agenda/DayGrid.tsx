import { useMemo, useState, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CheckCircle2, Circle, Clock, Plus, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import type { Todo } from '@/lib/types';
import { useTodos, useUpdateTodo, useCreateTodo } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import PriorityBadge from '@/components/todo/PriorityBadge';

// 30-min slots from 06:00 to 22:00
const START_HOUR = 6;
const END_HOUR = 22;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 32; // px per 30-min slot
const DEFAULT_DURATION = 60;

function slotsBetween(start: number, end: number) {
  const out: string[] = [];
  for (let h = start; h < end; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    out.push(`${String(h).padStart(2, '0')}:30`);
  }
  out.push(`${String(end).padStart(2, '0')}:00`);
  return out;
}

function toMinutes(timeStr: string | null) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function toTimeStr(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface Props {
  dateStr: string; // YYYY-MM-DD
}

export default function DayGrid({ dateStr }: Props) {
  const { data: allTodos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const update = useUpdateTodo();
  const create = useCreateTodo();
  const gridRef = useRef<HTMLDivElement>(null);

  const dayTodos = useMemo(
    () => allTodos.filter((t) => t.due_date === dateStr),
    [allTodos, dateStr]
  );
  const scheduled = dayTodos.filter((t) => t.start_time);
  const unscheduled = dayTodos.filter((t) => !t.start_time);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const todoId = String(active.id).replace(/^todo:/, '');
    const todo = allTodos.find((t) => t.id === todoId);
    if (!todo) return;

    if (typeof over.id === 'string' && over.id.startsWith('slot:')) {
      const time = over.id.slice(5); // HH:MM
      update.mutate({
        id: todoId,
        patch: {
          start_time: `${time}:00`,
          // Use effort estimate as duration default so blocks reflect planned time.
          duration_min:
            todo.duration_min ?? todo.effort_min ?? DEFAULT_DURATION,
          due_date: dateStr,
        },
      });
    } else if (over.id === 'unscheduled') {
      update.mutate({
        id: todoId,
        patch: { start_time: null, duration_min: null },
      });
    }
  }

  async function handleSlotDoubleClick(time: string) {
    const title = window.prompt(`Nieuwe to-do om ${time}`);
    if (!title?.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      due_date: dateStr,
      start_time: `${time}:00`,
      duration_min: DEFAULT_DURATION,
    });
  }

  const slots = slotsBetween(START_HOUR, END_HOUR);

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        <div className="day-grid">
          <div className="day-grid-head">
            <span className="dgh-day">{format(parseISO(dateStr), 'EEEE d MMMM')}</span>
            <span className="dgh-hint muted-text font-mono-tight">
              dubbel-klik voor nieuwe to-do
            </span>
          </div>
          <div ref={gridRef} className="relative">
            {/* Hour rows */}
            {slots.slice(0, -1).map((time) => (
              <Slot
                key={time}
                time={time}
                onDouble={() => handleSlotDoubleClick(time)}
              />
            ))}

            {/* Blocks overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ paddingLeft: 56 }}
            >
              {scheduled.map((t) => (
                <Block
                  key={t.id}
                  todo={t}
                  project={t.project_id ? projectMap.get(t.project_id) : null}
                  onToggle={() =>
                    update.mutate({
                      id: t.id,
                      patch: { status: t.status === 'done' ? 'todo' : 'done' },
                    })
                  }
                  onUnschedule={() =>
                    update.mutate({
                      id: t.id,
                      patch: { start_time: null, duration_min: null },
                    })
                  }
                />
              ))}
            </div>
          </div>
          <p
            className="muted-text font-mono-tight"
            style={{
              padding: '8px 16px',
              borderTop: '1px solid rgb(var(--border))',
              fontSize: 11,
            }}
          >
            Dubbel-klik op een slot voor nieuwe to-do · Sleep naar links voor ongepland
          </p>
        </div>

        {/* Unscheduled sidebar */}
        <UnscheduledColumn todos={unscheduled} projectMap={projectMap} />
      </div>
    </DndContext>
  );
}

function Slot({ time, onDouble }: { time: string; onDouble: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${time}` });
  const isHour = time.endsWith(':00');

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={onDouble}
      className={clsx(
        'flex border-t transition-colors cursor-pointer',
        isHour ? 'border-border' : 'border-border/40',
        isOver && 'bg-accent/10'
      )}
      style={{ height: SLOT_HEIGHT }}
    >
      <div className="w-14 shrink-0 text-[10px] text-muted pl-2 pt-1 tabular-nums">
        {isHour ? time : ''}
      </div>
      <div className="flex-1" />
    </div>
  );
}

function Block({
  todo,
  project,
  onToggle,
  onUnschedule,
}: {
  todo: Todo;
  project: any;
  onToggle: () => void;
  onUnschedule: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `todo:${todo.id}` });

  const startMin = toMinutes(todo.start_time);
  if (startMin === null) return null;
  const dayStartMin = START_HOUR * 60;
  const offsetMin = startMin - dayStartMin;
  const duration = todo.duration_min ?? DEFAULT_DURATION;
  const top = (offsetMin / SLOT_MIN) * SLOT_HEIGHT;
  const height = Math.max(SLOT_HEIGHT - 2, (duration / SLOT_MIN) * SLOT_HEIGHT - 2);

  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left: 0,
    right: 8,
    height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 5,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group rounded-md border bg-surface shadow-sm overflow-hidden pointer-events-auto touch-none',
        todo.status === 'done'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-accent/40 bg-accent/5',
        'hover:border-accent'
      )}
    >
      <div className="flex items-start gap-1.5 p-1.5 h-full">
        <button onClick={onToggle} className="shrink-0 mt-0.5">
          {todo.status === 'done' ? (
            <CheckCircle2 size={13} className="text-accent" />
          ) : (
            <Circle size={13} className="text-muted hover:text-accent" />
          )}
        </button>
        <div
          {...attributes}
          {...listeners}
          className="flex-1 min-w-0 cursor-grab"
        >
          <div
            className={clsx(
              'text-xs font-medium truncate',
              todo.status === 'done' && 'line-through text-muted'
            )}
          >
            {todo.title}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted tabular-nums">
              {todo.start_time?.slice(0, 5)} ·{' '}
              {todo.duration_min ?? DEFAULT_DURATION}m
            </span>
            <PriorityBadge priority={todo.priority} size="xs" />
            {project && (
              <span className="text-[9px] text-muted truncate">
                {project.title}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onUnschedule}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 p-0.5"
          aria-label="Ontplannen"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

function UnscheduledColumn({
  todos,
  projectMap,
}: {
  todos: Todo[];
  projectMap: Map<string, any>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'bg-surface border border-border rounded-lg p-3 h-fit transition-colors',
        isOver && 'border-accent/50 bg-accent/5'
      )}
    >
      <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-2 flex items-center gap-1.5">
        <Clock size={12} /> Ongepland vandaag
        <span className="ml-auto tabular-nums">{todos.length}</span>
      </h3>
      {todos.length === 0 ? (
        <p className="text-xs text-muted italic py-2">
          Alles is gepland 🎯
        </p>
      ) : (
        <div className="space-y-1.5">
          {todos.map((t) => (
            <UnscheduledCard
              key={t.id}
              todo={t}
              project={t.project_id ? projectMap.get(t.project_id) : null}
            />
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted mt-3 italic">
        Sleep een kaartje naar een tijdslot.
      </p>
    </div>
  );
}

function UnscheduledCard({ todo, project }: { todo: Todo; project: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `todo:${todo.id}` });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-start gap-2 p-2 rounded-md border border-border bg-surface2/40 text-xs cursor-grab hover:border-accent/40 touch-none"
    >
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{todo.title}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <PriorityBadge priority={todo.priority} size="xs" />
          {project && (
            <span className="text-[9px] text-muted truncate">
              {project.title}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
