import { clsx } from 'clsx';
import type { Priority } from '@/lib/types';

const STYLES: Record<Priority, string> = {
  1: 'text-red-600 border-red-500/30 bg-red-500/10',
  2: 'text-amber-600 border-amber-500/30 bg-amber-500/10',
  3: 'text-zinc-500 border-zinc-500/30 bg-zinc-500/10',
};

interface Props {
  priority: Priority;
  onChange?: (p: Priority) => void;
  size?: 'sm' | 'xs';
}

export default function PriorityBadge({ priority, onChange, size = 'sm' }: Props) {
  function cycle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onChange) return;
    const next: Priority = priority === 1 ? 2 : priority === 2 ? 3 : 1;
    onChange(next);
  }

  return (
    <span
      onClick={onChange ? cycle : undefined}
      className={clsx(
        'inline-flex items-center font-semibold border rounded',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1 py-0',
        STYLES[priority],
        onChange && 'cursor-pointer hover:opacity-80'
      )}
    >
      P{priority}
    </span>
  );
}
