import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useTodos } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import { useUI } from '@/store/ui';
import type { Todo } from '@/lib/types';

const PRIORITY_DOT: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-500',
};

export default function MonthGrid() {
  const [cursor, setCursor] = useState(() => new Date());
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const openTodo = useUI((s) => s.openTodo);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (!t.due_date || t.status === 'done') continue;
      if (!map.has(t.due_date)) map.set(t.due_date, []);
      map.get(t.due_date)!.push(t);
    }
    // sort each day's todos by priority
    for (const list of map.values()) {
      list.sort((a, b) => a.priority - b.priority);
    }
    return map;
  }, [todos]);

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) =>
      format(new Date(base.getTime() + i * 86400000), 'EEE', { locale: nl })
    );
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="p-1.5 rounded-md hover:bg-surface2 text-muted hover:text-text"
          aria-label="Vorige maand"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight capitalize">
            {format(cursor, 'MMMM yyyy', { locale: nl })}
          </h2>
          {!isSameMonth(cursor, new Date()) && (
            <button
              onClick={() => setCursor(new Date())}
              className="text-xs text-muted hover:text-text px-2 py-0.5 rounded border border-border"
            >
              Vandaag
            </button>
          )}
        </div>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="p-1.5 rounded-md hover:bg-surface2 text-muted hover:text-text"
          aria-label="Volgende maand"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
        {weekdayLabels.map((d) => (
          <div
            key={d}
            className="bg-surface2/50 text-[10px] uppercase tracking-wider text-muted font-medium px-2 py-1.5 text-center"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, cursor);
          const dayTodos = todosByDate.get(key) ?? [];
          const isCurrent = isToday(day);
          return (
            <div
              key={key}
              className={clsx(
                'bg-surface min-h-[96px] p-1.5 flex flex-col gap-1 text-left',
                !inMonth && 'opacity-40'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'text-xs tabular-nums',
                    isCurrent
                      ? 'bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center font-medium'
                      : 'text-muted px-1'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTodos.length > 3 && (
                  <span className="text-[9px] text-muted">+{dayTodos.length - 3}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayTodos.slice(0, 3).map((t) => {
                  const project = t.project_id ? projectMap.get(t.project_id) : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTodo(t.id)}
                      title={`${t.title}${project ? ` · ${project.title}` : ''}`}
                      className="group flex items-center gap-1 px-1 py-0.5 rounded text-[11px] bg-surface2 hover:bg-accent/10 text-left"
                    >
                      <span
                        className={clsx(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          PRIORITY_DOT[t.priority]
                        )}
                      />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

