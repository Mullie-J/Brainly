import { useRef, useState } from 'react';
import type { Todo } from '@/lib/types';
import { useUpdateTodo } from '@/hooks/useTodos';
import { useDeleteTodoWithUndo } from '@/hooks/useTodoActions';
import TodoContextMenu, { type ContextMenuPos } from '@/components/todo/TodoContextMenu';

const LONG_PRESS_MS = 500;
const TOUCH_MOVE_TOLERANCE_PX = 10;

/**
 * Reusable right-click + long-press context menu for any todo display.
 *
 * Usage:
 *   const { contextMenuProps, menu } = useTodoContextMenu(todo);
 *   return (<>
 *     <div {...contextMenuProps}>...</div>
 *     {menu}
 *   </>);
 *
 * Desktop: right-click triggers the menu at the cursor position.
 * Mobile: long-press (500ms) triggers the menu at the touch position.
 *   - We also block iOS Safari's default context menu via onContextMenu
 *     so the custom menu shows instead.
 */
export function useTodoContextMenu(todo: Todo) {
  const update = useUpdateTodo();
  const deleteWithUndo = useDeleteTodoWithUndo();
  const [pos, setPos] = useState<ContextMenuPos | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  function open(x: number, y: number) {
    setPos({ x, y });
  }
  function close() {
    setPos(null);
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    open(e.clientX, e.clientY);
  }

  function onTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = window.setTimeout(() => {
      open(touch.clientX, touch.clientY);
      // Vibrate as feedback if supported
      if (navigator.vibrate) navigator.vibrate(10);
    }, LONG_PRESS_MS);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!longPressTimer.current || !touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > TOUCH_MOVE_TOLERANCE_PX || dy > TOUCH_MOVE_TOLERANCE_PX) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function onTouchEnd() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  const contextMenuProps = {
    onContextMenu,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };

  const menu = pos ? (
    <TodoContextMenu
      todo={todo}
      pos={pos}
      onClose={close}
      onSnooze={(due_date) =>
        update.mutate({ id: todo.id, patch: { due_date } })
      }
      onToggleDone={() =>
        update.mutate({
          id: todo.id,
          patch: { status: todo.status === 'done' ? 'todo' : 'done' },
        })
      }
      onDelete={() => deleteWithUndo(todo)}
    />
  ) : null;

  return { contextMenuProps, menu };
}
