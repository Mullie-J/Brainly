import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Trash2, GripVertical, CheckCircle2, Circle, Flame, Repeat } from 'lucide-react';
import { clsx } from 'clsx';
import type { Todo, Priority } from '@/lib/types';
import { useUpdateTodo } from '@/hooks/useTodos';
import { useDeleteTodoWithUndo } from '@/hooks/useTodoActions';
import { useTodoContextMenu } from '@/hooks/useTodoContextMenu';
import { useUI } from '@/store/ui';
import PriorityBadge from './PriorityBadge';
import DateChip from './DateChip';

export default function TodoCard({ todo }: { todo: Todo }) {
  const update = useUpdateTodo();
  const deleteWithUndo = useDeleteTodoWithUndo();
  const openTodo = useUI((s) => s.openTodo);
  const [hover, setHover] = useState(false);
  const { contextMenuProps, menu } = useTodoContextMenu(todo);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...contextMenuProps}
      className="group bg-surface border border-border rounded-md p-2.5 text-sm hover:border-accent/40 hover:shadow-sm transition-all touch-none"
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() =>
            update.mutate({
              id: todo.id,
              patch: { status: todo.status === 'done' ? 'todo' : 'done' },
            })
          }
          className="mt-0.5 shrink-0 text-muted hover:text-accent"
          aria-label="Toggle done"
        >
          {todo.status === 'done' ? (
            <CheckCircle2 size={15} className="text-accent" />
          ) : (
            <Circle size={15} />
          )}
        </button>

        <button
          onClick={() => openTodo(todo.id)}
          className="flex-1 min-w-0 text-left"
        >
          <div className={clsx('truncate', todo.status === 'done' && 'line-through text-muted')}>
            {todo.title}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <PriorityBadge
              priority={todo.priority}
              onChange={(p: Priority) =>
                update.mutate({ id: todo.id, patch: { priority: p } })
              }
            />
            <DateChip
              value={todo.due_date}
              onChange={(due_date) =>
                update.mutate({ id: todo.id, patch: { due_date } })
              }
            />
            {todo.effort_min && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted">
                <Flame size={9} /> {formatMin(todo.effort_min)}
              </span>
            )}
            {todo.recurrence_type && (
              <span
                title={todo.recurrence_type}
                className="inline-flex items-center text-[10px] px-1 py-0.5 rounded border border-border text-muted"
              >
                <Repeat size={9} />
              </span>
            )}
          </div>
        </button>

        <div
          className={clsx(
            'flex flex-col items-center gap-1 shrink-0',
            !hover && 'opacity-0'
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted hover:text-text p-0.5"
            aria-label="Versleep"
          >
            <GripVertical size={13} />
          </button>
          <button
            onClick={() => deleteWithUndo(todo)}
            className="text-muted hover:text-red-500 p-0.5"
            aria-label="Verwijder"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
    {menu}
    </>
  );
}

function formatMin(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}u${rem}` : `${h}u`;
}
