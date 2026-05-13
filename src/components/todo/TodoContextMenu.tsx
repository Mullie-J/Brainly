import { useEffect, useRef } from 'react';
import { format, addDays, nextMonday, startOfDay } from 'date-fns';
import { CalendarClock, CalendarX, Trash2, CheckCircle2, Circle } from 'lucide-react';
import type { Todo } from '@/lib/types';

export interface ContextMenuPos {
  x: number;
  y: number;
}

interface Props {
  todo: Todo;
  pos: ContextMenuPos;
  onClose: () => void;
  onSnooze: (due_date: string | null) => void;
  onToggleDone: () => void;
  onDelete: () => void;
}

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function TodoContextMenu({
  todo,
  pos,
  onClose,
  onSnooze,
  onToggleDone,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const monday = nextMonday(today);
  const nextWeek = addDays(today, 7);

  // Keep menu inside viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(pos.y, window.innerHeight - 320),
    left: Math.min(pos.x, window.innerWidth - 220),
    zIndex: 60,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="w-56 bg-surface border border-border rounded-lg shadow-lg py-1 text-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={() => {
          onToggleDone();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-surface2 text-left"
      >
        {todo.status === 'done' ? (
          <Circle size={14} className="text-muted" />
        ) : (
          <CheckCircle2 size={14} className="text-accent" />
        )}
        {todo.status === 'done' ? 'Markeer als open' : 'Markeer als klaar'}
      </button>

      <div className="my-1 border-t border-border" />
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted">
        Snooze
      </div>
      <MenuItem
        icon={<CalendarClock size={14} className="text-muted" />}
        label="Vandaag"
        hint={format(today, 'EEE d MMM')}
        onClick={() => {
          onSnooze(ymd(today));
          onClose();
        }}
      />
      <MenuItem
        icon={<CalendarClock size={14} className="text-muted" />}
        label="Morgen"
        hint={format(tomorrow, 'EEE d MMM')}
        onClick={() => {
          onSnooze(ymd(tomorrow));
          onClose();
        }}
      />
      <MenuItem
        icon={<CalendarClock size={14} className="text-muted" />}
        label="Volgende maandag"
        hint={format(monday, 'EEE d MMM')}
        onClick={() => {
          onSnooze(ymd(monday));
          onClose();
        }}
      />
      <MenuItem
        icon={<CalendarClock size={14} className="text-muted" />}
        label="Volgende week"
        hint={format(nextWeek, 'EEE d MMM')}
        onClick={() => {
          onSnooze(ymd(nextWeek));
          onClose();
        }}
      />
      {todo.due_date && (
        <MenuItem
          icon={<CalendarX size={14} className="text-muted" />}
          label="Verwijder datum"
          onClick={() => {
            onSnooze(null);
            onClose();
          }}
        />
      )}

      <div className="my-1 border-t border-border" />
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-red-500/10 text-red-500 text-left"
      >
        <Trash2 size={14} /> Verwijderen
      </button>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-surface2 text-left"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-muted tabular-nums">{hint}</span>}
    </button>
  );
}
