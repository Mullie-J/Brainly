import { useRef } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { clsx } from 'clsx';

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  size?: 'sm' | 'md';
}

export default function DateChip({ value, onChange, size = 'sm' }: Props) {
  const date = value ? parseISO(value) : null;
  const overdue = date && isPast(date) && !isToday(date);
  const inputRef = useRef<HTMLInputElement>(null);

  function open(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    // showPicker() is the reliable cross-browser API to open the native date picker
    if (typeof (input as any).showPicker === 'function') {
      try {
        (input as any).showPicker();
        return;
      } catch {
        // Fall through to focus/click fallback
      }
    }
    input.focus();
    input.click();
  }

  return (
    <span
      onClick={open}
      className={clsx(
        'group/date relative inline-flex items-center gap-1 rounded border cursor-pointer transition-colors',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        date
          ? overdue
            ? 'text-red-600 border-red-500/30 bg-red-500/10 hover:bg-red-500/15'
            : 'text-muted border-border hover:border-accent/50'
          : 'text-muted border-dashed border-border hover:border-accent/50'
      )}
    >
      <CalendarDays size={size === 'sm' ? 10 : 12} />
      {date ? format(date, 'd MMM') : 'Datum'}
      {date && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onChange(null);
          }}
          className="opacity-0 group-hover/date:opacity-100 hover:text-red-500 relative z-10"
          aria-label="Verwijder datum"
        >
          <X size={size === 'sm' ? 9 : 11} />
        </button>
      )}
      <input
        ref={inputRef}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        onClick={(e) => e.stopPropagation()}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </span>
  );
}
