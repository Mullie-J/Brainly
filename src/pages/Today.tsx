import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  CheckCircle2,
  Circle,
  Moon,
  CalendarRange,
  ClipboardList,
  ArrowRight,
  Flame,
  Repeat,
} from 'lucide-react';
import {
  format,
  parseISO,
  isToday,
  isPast,
  getDay,
  getHours,
  getWeek,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import { useUI } from '@/store/ui';
import { currentWeekStart, useWeeklyReview } from '@/hooks/useWeeklyReview';
import PriorityBadge from '@/components/todo/PriorityBadge';
import Top3 from '@/components/today/Top3';
import ShutdownModal from '@/components/today/ShutdownModal';
import type { Todo } from '@/lib/types';

function greetingForHour(h: number): string {
  if (h < 6) return 'Vroege vogel';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function formatMin(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}u${rem}` : `${h}u`;
}

export default function Today() {
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const update = useUpdateTodo();
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const [shutdownOpen, setShutdownOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const greeting = greetingForHour(today.getHours());
  const weekStart = currentWeekStart();
  const { data: weeklyReview } = useWeeklyReview(weekStart);

  const dow = getDay(today);
  const isFridayOrLater = dow === 5 || dow === 6 || dow === 0;
  const isFridayAfternoon = dow === 5 && getHours(today) >= 15;
  const showReviewBanner =
    isFridayOrLater &&
    !weeklyReview?.completed_at &&
    (isFridayAfternoon || dow === 6 || dow === 0);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const overdue = todos
    .filter(
      (t) =>
        t.status !== 'done' &&
        t.due_date &&
        isPast(parseISO(t.due_date)) &&
        !isToday(parseISO(t.due_date))
    )
    .sort(
      (a, b) =>
        (a.due_date ?? '').localeCompare(b.due_date ?? '') ||
        a.priority - b.priority
    );

  const dueToday = todos.filter(
    (t) =>
      t.status !== 'done' &&
      t.due_date &&
      isToday(parseISO(t.due_date))
  );
  const doing = todos.filter((t) => t.status === 'doing');
  const completedToday = todos.filter(
    (t) => t.completed_at && isToday(parseISO(t.completed_at))
  );

  return (
    <div className="page page-narrow">
      <header className="today-head">
        <div className="today-head-l">
          <div className="page-eyebrow today-eyebrow">
            <span className="eyebrow-dot" />
            {format(today, 'EEEE d MMMM yyyy', { locale: nl })} · week{' '}
            {getWeek(today)}
          </div>
          <h1 className="page-title today-title">{greeting}.</h1>
        </div>
        <div className="today-head-r">
          <Link to="/agenda" className="btn btn-ghost">
            <CalendarRange size={14} /> Plan week
          </Link>
          <button onClick={() => setShutdownOpen(true)} className="btn btn-ghost">
            <Moon size={14} /> Shutdown
          </button>
          <button onClick={() => openQuickAdd()} className="btn btn-primary">
            <Plus size={14} /> To-do
          </button>
        </div>
      </header>

      {showReviewBanner && (
        <Link
          to="/weekly-review"
          className="north-star"
          style={{ marginTop: 0, marginBottom: 24 }}
        >
          <ClipboardList size={18} className="ns-icon" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ns-label">// weekly review</div>
            <div className="ns-text">
              Tijd voor je weekly review — reflecteer op deze week, plan top 3 per dag.
            </div>
          </div>
          <ArrowRight size={14} className="ns-icon" />
        </Link>
      )}

      <Top3 date={today} />

      {doing.length > 0 && (
        <TodaySection title="In uitvoering" badge={doing.length}>
          <div className="row-list">
            {doing.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                project={t.project_id ? projectMap.get(t.project_id) : null}
                update={update}
              />
            ))}
          </div>
        </TodaySection>
      )}

      {overdue.length > 0 && (
        <TodaySection
          title="Overtijd"
          badge={overdue.length}
          variant="overdue"
          icon={<Flame size={12} />}
        >
          <div className="row-list">
            {overdue.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                project={t.project_id ? projectMap.get(t.project_id) : null}
                update={update}
              />
            ))}
          </div>
        </TodaySection>
      )}

      <TodaySection
        title="Vandaag"
        badge={dueToday.length}
        empty={
          overdue.length === 0 && doing.length === 0 && dueToday.length === 0
            ? 'Geen open taken voor vandaag — adem rustig.'
            : undefined
        }
      >
        {dueToday.length > 0 && (
          <div className="row-list">
            {dueToday.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                project={t.project_id ? projectMap.get(t.project_id) : null}
                update={update}
              />
            ))}
          </div>
        )}
      </TodaySection>

      {completedToday.length > 0 && (
        <TodaySection title="Afgewerkt vandaag" badge={completedToday.length} dimmed>
          <div className="row-list">
            {completedToday.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                project={t.project_id ? projectMap.get(t.project_id) : null}
                update={update}
              />
            ))}
          </div>
        </TodaySection>
      )}

      <ShutdownModal open={shutdownOpen} onClose={() => setShutdownOpen(false)} />
    </div>
  );
}

function TodaySection({
  title,
  badge,
  variant,
  icon,
  dimmed,
  empty,
  children,
}: {
  title: string;
  badge: number;
  variant?: 'overdue';
  icon?: React.ReactNode;
  dimmed?: boolean;
  empty?: string;
  children?: React.ReactNode;
}) {
  if (badge === 0 && !empty) return null;
  return (
    <section
      className={clsx('t-section', dimmed && 'dim', variant && `t-section-${variant}`)}
      style={{ marginBottom: 24 }}
    >
      <h2 className={clsx('section-title', variant)}>
        {icon}
        {title}
        <span className="section-count tabular">{badge}</span>
      </h2>
      {badge === 0 && empty ? <p className="section-empty">{empty}</p> : children}
    </section>
  );
}

function TodoRow({
  todo,
  project,
  update,
}: {
  todo: Todo;
  project: any;
  update: ReturnType<typeof useUpdateTodo>;
}) {
  const openTodo = useUI((s) => s.openTodo);
  return (
    <div className={clsx('row', todo.status === 'done' && 'row-done')}>
      <button
        onClick={() =>
          update.mutate({
            id: todo.id,
            patch: { status: todo.status === 'done' ? 'todo' : 'done' },
          })
        }
        className="check"
        aria-label="Toggle"
      >
        {todo.status === 'done' ? (
          <CheckCircle2 size={15} />
        ) : (
          <Circle size={15} />
        )}
      </button>
      <button onClick={() => openTodo(todo.id)} className="row-body">
        <span className={clsx('row-title', todo.status === 'done' && 'strike')}>
          {todo.title}
        </span>
        <span className="row-meta">
          <PriorityBadge priority={todo.priority} />
          {todo.due_date && (
            <span className={clsx('chip', isToday(parseISO(todo.due_date)) && 'chip-today')}>
              {format(parseISO(todo.due_date), 'd MMM', { locale: nl })}
            </span>
          )}
          {todo.effort_min && (
            <span className="meta-effort">
              <Flame size={9} /> {formatMin(todo.effort_min)}
            </span>
          )}
          {todo.recurrence_type && (
            <span className="meta-tag">
              <Repeat size={9} />
            </span>
          )}
          {project ? (
            <Link
              to={`/p/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="proj-chip"
            >
              <span className="proj-swatch" style={{ background: 'var(--accent)' }} />
              <span className="proj-chip-label">{project.title}</span>
            </Link>
          ) : (
            <span className="meta-inbox">Inbox</span>
          )}
          {todo.status === 'doing' && <span className="meta-doing">· bezig</span>}
        </span>
      </button>
    </div>
  );
}
