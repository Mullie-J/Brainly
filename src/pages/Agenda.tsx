import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
} from 'lucide-react';
import {
  addDays,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import { useUI } from '@/store/ui';
import { useTodoContextMenu } from '@/hooks/useTodoContextMenu';
import PriorityBadge from '@/components/todo/PriorityBadge';
import DateChip from '@/components/todo/DateChip';
import DayGrid from '@/components/agenda/DayGrid';
import WeekBoard from '@/components/agenda/WeekBoard';
import MonthGrid from '@/components/agenda/MonthGrid';
import type { Todo } from '@/lib/types';

type Range = 'week-plan' | 'day' | 'today' | 'week' | 'month' | 'project';

const RANGES: { id: Range; label: string }[] = [
  { id: 'week-plan', label: '📅 Weekplanning' },
  { id: 'day', label: 'Dag (time blocks)' },
  { id: 'today', label: 'Vandaag' },
  { id: 'week', label: 'Deze week (lijst)' },
  { id: 'month', label: 'Maand' },
  { id: 'project', label: 'Per project' },
];

export default function Agenda() {
  const [range, setRange] = useState<Range>('week-plan');
  const [selectedProject, setSelectedProject] = useState<string | 'all'>('all');
  const [dayDate, setDayDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Datums met to-do's (incl. overdue) — alleen open todos
  const dated = useMemo(
    () =>
      todos.filter(
        (t) => t.due_date && t.status !== 'done'
      ),
    [todos]
  );

  const today = startOfDay(new Date());
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // Grouping by day
  const days = useMemo(() => {
    if (range === 'today') {
      const overdue = dated.filter(
        (t) =>
          t.due_date &&
          isPast(parseISO(t.due_date)) &&
          !isToday(parseISO(t.due_date))
      );
      const todayTodos = dated.filter(
        (t) => t.due_date && isToday(parseISO(t.due_date))
      );
      return [
        ...(overdue.length > 0
          ? [{ key: 'overdue', label: 'Overtijd', todos: overdue, isOverdue: true }]
          : []),
        { key: 'today', label: format(today, 'EEEE d MMMM', { locale: nl }), todos: todayTodos },
      ];
    }

    if (range === 'week') {
      const result: { key: string; label: string; todos: Todo[]; isOverdue?: boolean }[] = [];
      const overdue = dated.filter(
        (t) =>
          t.due_date &&
          isPast(parseISO(t.due_date)) &&
          !isToday(parseISO(t.due_date))
      );
      if (overdue.length > 0) {
        result.push({ key: 'overdue', label: 'Overtijd', todos: overdue, isOverdue: true });
      }
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const dayTodos = dated.filter(
          (t) => t.due_date && isSameDay(parseISO(t.due_date), d)
        );
        result.push({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'EEEE d MMMM', { locale: nl }),
          todos: dayTodos,
        });
      }
      return result;
    }

    // Per project
    const projectTodos = (
      selectedProject === 'all'
        ? dated
        : dated.filter((t) => t.project_id === selectedProject)
    ).sort((a, b) =>
      (a.due_date ?? '').localeCompare(b.due_date ?? '')
    );

    // group by date string
    const groups = new Map<string, Todo[]>();
    for (const t of projectTodos) {
      const key = t.due_date!;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, list]) => {
        const d = parseISO(dateStr);
        return {
          key: dateStr,
          label: format(d, 'EEEE d MMMM', { locale: nl }),
          todos: list,
          isOverdue: isPast(d) && !isToday(d),
        };
      });
  }, [range, dated, selectedProject, today, weekStart]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const todayCount = dated.filter(
      (t) =>
        t.due_date &&
        (isToday(parseISO(t.due_date)) ||
          (isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))))
    ).length;
    const weekCount = dated.filter(
      (t) =>
        t.due_date &&
        (isWithinInterval(parseISO(t.due_date), {
          start: weekStart,
          end: weekEnd,
        }) ||
          (isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))))
    ).length;
    return { todayCount, weekCount, total: dated.length };
  }, [dated, weekStart, weekEnd]);

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <CalendarIcon size={11} /> Agenda
          </div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">
            <span className="tabular">{counts.total}</span>{' '}
            {counts.total === 1 ? 'to-do' : "to-do's"} met een datum
          </p>
        </div>
        <div className="page-actions">
          <button onClick={() => openQuickAdd()} className="btn btn-primary">
            <Plus size={14} /> To-do
          </button>
        </div>
      </header>

      <div className="toolbar">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={clsx('pill', range === r.id && 'on')}
          >
            {r.label}
            {r.id === 'today' && counts.todayCount > 0 && (
              <span className="tabular" style={{ fontSize: 10, opacity: 0.8 }}>
                {counts.todayCount}
              </span>
            )}
            {r.id === 'week' && counts.weekCount > 0 && (
              <span className="tabular" style={{ fontSize: 10, opacity: 0.8 }}>
                {counts.weekCount}
              </span>
            )}
          </button>
        ))}

        {range === 'project' && (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value as any)}
            className="ml-1 text-sm bg-surface border border-border rounded-full px-3 py-1.5 focus:outline-none hover:border-accent/50"
          >
            <option value="all">Alle projecten</option>
            <option value="">📥 Inbox</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
        {range === 'day' && (
          <input
            type="date"
            value={dayDate}
            onChange={(e) => setDayDate(e.target.value)}
            className="ml-1 text-sm bg-surface border border-border rounded-full px-3 py-1.5 focus:outline-none hover:border-accent/50"
          />
        )}
      </div>

      {/* Week planning board */}
      {range === 'week-plan' && <WeekBoard />}

      {/* Day grid view */}
      {range === 'day' && <DayGrid dateStr={dayDate} />}

      {/* Month grid view */}
      {range === 'month' && <MonthGrid />}

      {/* List views */}
      {range !== 'day' && range !== 'week-plan' && range !== 'month' && (
      <div className="space-y-6">
        {days.map((day) => (
          <DaySection
            key={day.key}
            label={day.label}
            todos={day.todos}
            isOverdue={(day as any).isOverdue}
            projectMap={projectMap}
          />
        ))}

        {days.every((d) => d.todos.length === 0) && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted">
              Geen to-do's met een datum in deze view.
            </p>
            <p className="text-xs text-muted mt-1">
              Tip: klik op de datum-chip van een bestaande to-do om er een te plannen.
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function DaySection({
  label,
  todos,
  isOverdue,
  projectMap,
}: {
  label: string;
  todos: Todo[];
  isOverdue?: boolean;
  projectMap: Map<string, any>;
}) {
  const update = useUpdateTodo();

  return (
    <section>
      <h2
        className={clsx(
          'text-xs uppercase tracking-wider font-medium mb-2',
          isOverdue ? 'text-red-500' : 'text-muted'
        )}
      >
        {label}
        <span className="ml-2 text-muted tabular-nums normal-case font-normal">
          {todos.length}
        </span>
      </h2>

      {todos.length === 0 ? (
        <p className="text-sm text-muted py-1 italic">Niets gepland.</p>
      ) : (
        <div className="space-y-1.5">
          {todos.map((t) => {
            const project = t.project_id ? projectMap.get(t.project_id) : null;
            return (
              <AgendaRow
                key={t.id}
                todo={t}
                project={project}
                update={update}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function AgendaRow({
  todo: t,
  project,
  update,
}: {
  todo: Todo;
  project: any;
  update: ReturnType<typeof useUpdateTodo>;
}) {
  const openTodo = useUI((s) => s.openTodo);
  const { contextMenuProps, menu } = useTodoContextMenu(t);
  return (
    <>
    <div
      className="group flex items-start gap-2.5 px-3 py-2 bg-surface border border-border rounded-md text-sm hover:border-accent/40 transition-colors"
      {...contextMenuProps}
    >
      <button
        onClick={() =>
          update.mutate({
            id: t.id,
            patch: { status: t.status === 'done' ? 'todo' : 'done' },
          })
        }
        className="mt-0.5 shrink-0 text-muted hover:text-accent"
      >
        {t.status === 'done' ? (
          <CheckCircle2 size={15} className="text-accent" />
        ) : (
          <Circle size={15} />
        )}
      </button>
      <button
        onClick={() => openTodo(t.id)}
        className="flex-1 min-w-0 text-left"
      >
        <div
          className={clsx(
            'truncate',
            t.status === 'done' && 'line-through text-muted'
          )}
        >
          {t.title}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <PriorityBadge priority={t.priority} />
          {project ? (
            <Link
              to={`/p/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-muted hover:text-accent truncate"
            >
              {project.title}
            </Link>
          ) : (
            <span className="text-[10px] text-muted">Inbox</span>
          )}
          <DateChip
            value={t.due_date}
            onChange={(due_date) =>
              update.mutate({ id: t.id, patch: { due_date } })
            }
          />
        </div>
      </button>
    </div>
    {menu}
    </>
  );
}
