import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { Todo, TodoStatus, Priority } from '@/lib/types';
import { useTodos, useUpdateTodo, useCreateTodo } from '@/hooks/useTodos';
import TodoCard from './TodoCard';

const COLUMNS: { id: TodoStatus; label: string }[] = [
  { id: 'todo', label: 'Te doen' },
  { id: 'doing', label: 'Bezig' },
  { id: 'done', label: 'Klaar' },
];

function Column({
  status,
  label,
  todos,
  projectId,
}: {
  status: TodoStatus;
  label: string;
  todos: Todo[];
  projectId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const create = useCreateTodo();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setAdding(false);
      return;
    }
    setErr(null);
    try {
      await create.mutateAsync({
        title: text.trim(),
        project_id: projectId ?? null,
        status,
        priority: 2 as Priority,
      });
      setText('');
    } catch (e: any) {
      setErr(e?.message ?? 'Onbekende fout');
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-surface2/40 rounded-lg p-2 min-w-[260px] flex-1 transition-colors ${
        isOver ? 'bg-accent/5 ring-1 ring-accent/30' : ''
      }`}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xs uppercase tracking-wider text-muted font-medium">
          {label}
        </h3>
        <span className="text-xs text-muted tabular-nums">{todos.length}</span>
      </div>

      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5 min-h-[20px]">
          {todos.map((t) => (
            <TodoCard key={t.id} todo={t} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <form onSubmit={submit} className="mt-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAdding(false);
                setText('');
                setErr(null);
              }
            }}
            placeholder="Nieuwe to-do..."
            className="w-full bg-surface border border-border rounded-md px-2.5 py-2 text-sm focus:outline-none focus:border-accent"
          />
          {err && (
            <p className="text-[11px] text-red-500 mt-1 px-1">{err}</p>
          )}
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted hover:text-text rounded-md hover:bg-surface2 transition-colors"
        >
          <Plus size={12} /> Toevoegen
        </button>
      )}
    </div>
  );
}

export default function TodoBoard({ projectId }: { projectId?: string | null }) {
  const { data: todos = [] } = useTodos({ projectId });
  const update = useUpdateTodo();
  const [active, setActive] = useState<Todo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const byCol = useMemo(() => {
    const out: Record<TodoStatus, Todo[]> = { todo: [], doing: [], done: [] };
    for (const t of todos) out[t.status].push(t);
    return out;
  }, [todos]);

  function onDragStart(e: DragStartEvent) {
    const t = todos.find((x) => x.id === e.active.id);
    setActive(t ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const { active: a, over } = e;
    if (!over) return;

    const dragged = todos.find((t) => t.id === a.id);
    if (!dragged) return;

    let targetStatus: TodoStatus | null = null;
    if (typeof over.id === 'string' && over.id.startsWith('col:')) {
      targetStatus = over.id.slice(4) as TodoStatus;
    } else {
      const overTodo = todos.find((t) => t.id === over.id);
      if (overTodo) targetStatus = overTodo.status;
    }
    if (targetStatus && targetStatus !== dragged.status) {
      update.mutate({ id: dragged.id, patch: { status: targetStatus } });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col md:flex-row gap-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            label={col.label}
            todos={byCol[col.id]}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>{active ? <TodoCard todo={active} /> : null}</DragOverlay>
    </DndContext>
  );
}
