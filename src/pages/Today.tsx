import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, CheckCircle2, Circle, Moon, CalendarRange, ClipboardList, ArrowRight } from 'lucide-react';
import { format, parseISO, isToday, isPast, getDay, getHours } from 'date-fns';
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

export default function Today() {
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const update = useUpdateTodo();
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const [shutdownOpen, setShutdownOpen] = useState(false);

  const today = new Date();
  const weekStart = currentWeekStart();
  const { data: weeklyReview } = useWeeklyReview(weekStart);
  // Show banner on Friday (or Sat/Sun if not done yet) when no review for this week
  const dow = getDay(today);
  const isFridayOrLater = dow === 5 || dow === 6 || dow === 0;
  const isFridayAfternoon = dow === 5 && getHours(today) >= 15;
  const showReviewBanner =
    isFridayOrLater && !weeklyReview?.completed_at &&
    (isFridayAfternoon || dow === 6 || dow === 0);
  const doing = todos.filter((t) => t.status === 'doing');
  const dueToday = todos.filter(
    (t) =>
      t.status !== 'done' &&
      t.due_date &&
      (isToday(parseISO(t.due_date)) || isPast(parseISO(t.due_date)))
  );
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const completedToday = todos.filter(
    (t) => t.completed_at && isToday(parseISO(t.completed_at))
  );

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Star size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vandaag</h1>
            <p className="text-xs text-muted">
              {format(today, 'EEEE d MMMM yyyy', { locale: nl })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/agenda"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted hover:text-text hover:border-accent/50"
            title="Plan deze week"
          >
            <CalendarRange size={14} /> Plan week
          </Link>
          <button
            onClick={() => setShutdownOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted hover:text-text hover:border-accent/50"
            title="Shutdown ritual"
          >
            <Moon size={14} /> Shutdown
          </button>
          <button
            onClick={() => openQuickAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90"
          >
            <Plus size={14} /> To-do
          </button>
        </div>
      </div>

      {showReviewBanner && (
        <Link
          to="/weekly-review"
          className="mb-5 flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
        >
          <ClipboardList size={18} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Tijd voor je weekly review</p>
            <p className="text-xs text-muted">
              Reflecteer op deze week en plan top 3 per dag voor volgende week.
            </p>
          </div>
          <ArrowRight size={14} className="text-accent shrink-0" />
        </Link>
      )}

      {/* Daily Top 3 — evidence-backed: Ivy Lee + MIT */}
      <Top3 date={today} />

      <Section
        title="In uitvoering"
        todos={doing}
        projectMap={projectMap}
        update={update}
        empty="Niets in uitvoering."
      />
      <Section
        title="Verloopt vandaag / overtijd"
        todos={dueToday}
        projectMap={projectMap}
        update={update}
        empty="Geen openstaande deadlines."
      />

      {completedToday.length > 0 && (
        <Section
          title="Vandaag afgewerkt"
          todos={completedToday}
          projectMap={projectMap}
          update={update}
          dimmed
        />
      )}

      <ShutdownModal open={shutdownOpen} onClose={() => setShutdownOpen(false)} />
    </div>
  );
}

function SectionRow({
  todo: t,
  project,
  update,
  dimmed,
}: {
  todo: Todo;
  project: any;
  update: ReturnType<typeof useUpdateTodo>;
  dimmed?: boolean;
}) {
  const openTodo = useUI((s) => s.openTodo);
  return (
    <div
      className={clsx(
        'group flex items-start gap-2.5 px-3 py-2 bg-surface border border-border rounded-md text-sm hover:border-accent/40 transition-colors',
        dimmed && 'opacity-60'
      )}
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
        <div className={clsx(t.status === 'done' && 'line-through text-muted')}>
          {t.title}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <PriorityBadge priority={t.priority} />
          {project && (
            <Link
              to={`/p/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-muted hover:text-accent truncate"
            >
              {project.title}
            </Link>
          )}
          {t.due_date && (
            <span className="text-[10px] text-muted">
              {format(parseISO(t.due_date), 'd MMM')}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

function Section({
  title,
  todos,
  projectMap,
  update,
  empty,
  dimmed,
}: {
  title: string;
  todos: any[];
  projectMap: Map<string, any>;
  update: ReturnType<typeof useUpdateTodo>;
  empty?: string;
  dimmed?: boolean;
}) {
  if (todos.length === 0 && !empty) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
        {title}
      </h2>
      <div className="space-y-1.5">
        {todos.length === 0 && <p className="text-sm text-muted py-1">{empty}</p>}
        {todos.map((t) => (
          <SectionRow
            key={t.id}
            todo={t}
            project={t.project_id ? projectMap.get(t.project_id) : null}
            update={update}
            dimmed={dimmed}
          />
        ))}
      </div>
    </section>
  );
}
