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

const PRIORITY_COLOR: Record<number, string> = {
  1: 'rgb(var(--rose))',
  2: 'rgb(var(--amber))',
  3: 'rgb(var(--emerald))',
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
      <div className="wkp-pool-head" style={{ marginBottom: 12 }}>
        <button
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="wkp-nav"
          aria-label="Vorige maand"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="wkp-range" style={{ flex: 1, justifyContent: 'center' }}>
          <span className="wkp-range-l" style={{ textTransform: 'capitalize' }}>
            {format(cursor, 'MMMM yyyy', { locale: nl })}
          </span>
          {!isSameMonth(cursor, new Date()) && (
            <button
              onClick={() => setCursor(new Date())}
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '3px 8px' }}
            >
              Vandaag
            </button>
          )}
        </div>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="wkp-nav"
          aria-label="Volgende maand"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          background: 'rgb(var(--border))',
          border: '1px solid rgb(var(--border))',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {weekdayLabels.map((d) => (
          <div
            key={d}
            className="font-mono-tight muted-text"
            style={{
              background: 'rgb(var(--surface-2) / 0.6)',
              padding: '6px 8px',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
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
              className={clsx(!inMonth && 'opacity-40')}
              style={{
                background: 'rgb(var(--surface))',
                minHeight: 100,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="tabular"
                  style={
                    isCurrent
                      ? {
                          background: 'var(--accent)',
                          color: 'var(--accent-fg)',
                          borderRadius: 999,
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: 11,
                        }
                      : { color: 'rgb(var(--muted))', fontSize: 11, padding: '0 4px' }
                  }
                >
                  {format(day, 'd')}
                </span>
                {dayTodos.length > 3 && (
                  <span className="muted-text" style={{ fontSize: 10 }}>
                    +{dayTodos.length - 3}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayTodos.slice(0, 3).map((t) => {
                  const project = t.project_id ? projectMap.get(t.project_id) : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTodo(t.id)}
                      title={`${t.title}${project ? ` · ${project.title}` : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 4px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: 'rgb(var(--surface-2))',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          flexShrink: 0,
                          background: PRIORITY_COLOR[t.priority],
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
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

