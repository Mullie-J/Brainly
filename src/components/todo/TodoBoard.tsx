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

const COLUMNS: { id: TodoStatus; label: string; dotClass: string }[] = [
  { id: 'todo', label: 'Te doen', dotClass: 'kcol-dot-todo' },
  { id: 'doing', label: 'Bezig', dotClass: 'kcol-dot-doing' },
  { id: 'done', label: 'Klaar', dotClass: 'kcol-dot-done' },
];

function Column({
  status,
  label,
  dotClass,
  todos,
  projectId,
}: {
  status: TodoStatus;
  label: string;
  dotClass: string;
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
      className={`kcol ${isOver ? 'over' : ''}`}
    >
      <div className="kcol-head">
        <div className="kcol-label">
          <span className={`kcol-dot ${dotClass}`} />
          {label}
        </div>
        <span className="muted-text tabular font-mono-tight">{todos.length}</span>
      </div>

      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="kcol-body">
          {todos.map((t) => (
            <TodoCard key={t.id} todo={t} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <form onSubmit={submit} style={{ marginTop: 8 }}>
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
            style={{
              width: '100%',
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 'var(--radius)',
              padding: '8px 10px',
              fontSize: 13,
            }}
          />
          {err && (
            <p style={{ fontSize: 11, color: 'rgb(var(--rose))', marginTop: 4 }}>{err}</p>
          )}
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="kcol-add">
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
      <div className="kanban">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            label={col.label}
            dotClass={col.dotClass}
            todos={byCol[col.id]}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>{active ? <TodoCard todo={active} /> : null}</DragOverlay>
    </DndContext>
  );
}
