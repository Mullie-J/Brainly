import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { clsx } from 'clsx';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';
import {
  useBulkDeleteTodosWithUndo,
  useBulkUpdateTodos,
} from '@/hooks/useTodoActions';
import { useProjects } from '@/hooks/useProjects';
import { useUI } from '@/store/ui';
import PriorityBadge from '@/components/todo/PriorityBadge';
import DateChip from '@/components/todo/DateChip';
import BulkActionBar from '@/components/todo/BulkActionBar';
import { Flame, Repeat, Square, CheckSquare } from 'lucide-react';
import type { Todo, TodoStatus, Priority } from '@/lib/types';

type SortKey = 'priority' | 'due_date' | 'recent' | 'status';
type StatusFilter = 'open' | 'done' | 'all';
type ProjectFilter = 'all' | 'none' | string;

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'priority', label: 'Prioriteit' },
  { id: 'due_date', label: 'Deadline' },
  { id: 'recent', label: 'Recent toegevoegd' },
  { id: 'status', label: 'Status' },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Klaar' },
  { id: 'all', label: 'Alles' },
];

const STATUS_LABEL: Record<TodoStatus, string> = {
  todo: 'Te doen',
  doing: 'Bezig',
  done: 'Klaar',
};

const STATUS_ORDER: Record<TodoStatus, number> = { doing: 0, todo: 1, done: 2 };

export default function AllTodos() {
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const update = useUpdateTodo();
  const bulkUpdate = useBulkUpdateTodos();
  const bulkDelete = useBulkDeleteTodosWithUndo();
  const openQuickAdd = useUI((s) => s.openQuickAdd);

  const [sort, setSort] = useState<SortKey>('priority');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const unassignedCount = useMemo(
    () => todos.filter((t) => !t.project_id && t.status !== 'done').length,
    [todos]
  );

  const filtered = useMemo(() => {
    let out = [...todos];
    if (statusFilter === 'open') out = out.filter((t) => t.status !== 'done');
    if (statusFilter === 'done') out = out.filter((t) => t.status === 'done');
    if (projectFilter === 'none') out = out.filter((t) => !t.project_id);
    else if (projectFilter !== 'all')
      out = out.filter((t) => t.project_id === projectFilter);
    return out;
  }, [todos, statusFilter, projectFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sort === 'priority') {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
      }
      if (sort === 'due_date') {
        // todos without due date last
        const ad = a.due_date ?? '9999-12-31';
        const bd = b.due_date ?? '9999-12-31';
        if (ad !== bd) return ad.localeCompare(bd);
        return a.priority - b.priority;
      }
      if (sort === 'status') {
        if (a.status !== b.status) {
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        }
        return a.priority - b.priority;
      }
      // recent
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [filtered, sort]);

  // Group by sort key for visual sections (when relevant)
  const groups = useMemo(() => {
    if (sort === 'priority') {
      return groupBy(sorted, (t) => `P${t.priority}`);
    }
    if (sort === 'status') {
      return groupBy(sorted, (t) => STATUS_LABEL[t.status]);
    }
    if (sort === 'due_date') {
      return groupBy(sorted, (t) => {
        if (!t.due_date) return 'Geen datum';
        const d = parseISO(t.due_date);
        if (isPast(d) && !isToday(d)) return 'Overtijd';
        if (isToday(d)) return 'Vandaag';
        return format(d, 'd MMM yyyy');
      });
    }
    return [{ key: '', label: '', items: sorted }];
  }, [sorted, sort]);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface2 flex items-center justify-center">
            <ListTodo size={18} className="text-muted" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Alle to-do's</h1>
            <p className="text-xs text-muted">
              {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
              {filtered.length !== todos.length && (
                <> · {todos.length} totaal</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => openQuickAdd()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90"
        >
          <Plus size={14} /> To-do
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Status filter */}
        <div className="flex items-center gap-0.5 bg-surface2/50 rounded-full p-0.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={clsx(
                'text-xs px-2.5 py-1 rounded-full transition-colors',
                statusFilter === s.id
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Project filter */}
        <div className="relative">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value as any)}
            className={clsx(
              'appearance-none text-xs pl-3 pr-8 py-1.5 bg-surface border rounded-full hover:border-accent/50 focus:outline-none cursor-pointer transition-colors',
              unassignedCount > 0 && projectFilter !== 'none'
                ? 'border-amber-500/40'
                : 'border-border'
            )}
          >
            <option value="all">Alle projecten</option>
            <option value="none">📥 Zonder project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          {/* Unassigned notification badge */}
          {unassignedCount > 0 && projectFilter !== 'none' && (
            <button
              onClick={() => setProjectFilter('none')}
              title={`${unassignedCount} to-do's zonder project — klik om te filteren`}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center shadow-sm hover:scale-110 transition-transform tabular-nums"
            >
              {unassignedCount}
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-1.5">
          <ArrowUpDown size={12} className="text-muted" />
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none text-xs pl-2.5 pr-7 py-1.5 bg-surface border border-border rounded-full hover:border-accent/50 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  Sorteer op {s.label.toLowerCase()}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted">Geen to-do's in deze view.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              {g.label && (
                <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-2 px-1">
                  {g.label}{' '}
                  <span className="ml-1 tabular-nums normal-case font-normal">
                    {g.items.length}
                  </span>
                </h2>
              )}
              <div className="space-y-1">
                {g.items.map((t) => (
                  <Row
                    key={t.id}
                    todo={t}
                    project={t.project_id ? projectMap.get(t.project_id) : null}
                    selected={selectedIds.has(t.id)}
                    selectionActive={selectedIds.size > 0}
                    onSelect={() => toggleSelect(t.id)}
                    onToggle={() =>
                      update.mutate({
                        id: t.id,
                        patch: {
                          status: t.status === 'done' ? 'todo' : 'done',
                        },
                      })
                    }
                    onPriority={(p) =>
                      update.mutate({ id: t.id, patch: { priority: p } })
                    }
                    onDate={(d) =>
                      update.mutate({ id: t.id, patch: { due_date: d } })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <BulkActionBar
        count={selectedIds.size}
        todos={todos.filter((t) => selectedIds.has(t.id))}
        onClear={clearSelection}
        onSetStatus={async (status) => {
          await bulkUpdate(Array.from(selectedIds), { status });
          clearSelection();
        }}
        onSetDate={async (due_date) => {
          await bulkUpdate(Array.from(selectedIds), { due_date });
          clearSelection();
        }}
        onSetProject={async (project_id) => {
          await bulkUpdate(Array.from(selectedIds), { project_id });
          clearSelection();
        }}
        onDelete={async () => {
          await bulkDelete(todos.filter((t) => selectedIds.has(t.id)));
          clearSelection();
        }}
      />
    </div>
  );
}

function Row({
  todo,
  project,
  selected,
  selectionActive,
  onSelect,
  onToggle,
  onPriority,
  onDate,
}: {
  todo: Todo;
  project: any;
  selected: boolean;
  selectionActive: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onPriority: (p: Priority) => void;
  onDate: (d: string | null) => void;
}) {
  const openTodo = useUI((s) => s.openTodo);
  return (
    <div
      className={clsx(
        'group flex items-start gap-2.5 px-3 py-2 bg-surface border rounded-md text-sm transition-colors',
        selected
          ? 'border-accent/60 bg-accent/5'
          : 'border-border hover:border-accent/40'
      )}
    >
      <button
        onClick={onSelect}
        className={clsx(
          'mt-0.5 shrink-0 transition-opacity',
          selected || selectionActive
            ? 'opacity-100 text-accent'
            : 'opacity-0 group-hover:opacity-100 text-muted hover:text-text'
        )}
        aria-label={selected ? 'Deselecteer' : 'Selecteer'}
      >
        {selected ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>
      <button
        onClick={onToggle}
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
        <div
          className={clsx(
            'truncate',
            todo.status === 'done' && 'line-through text-muted'
          )}
        >
          {todo.title}
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <PriorityBadge priority={todo.priority} onChange={onPriority} />
          <DateChip value={todo.due_date} onChange={onDate} />
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
          {project ? (
            <Link
              to={`/p/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-muted hover:text-accent truncate"
            >
              {project.title}
            </Link>
          ) : (
            <span className="text-[10px] text-muted italic">Zonder project</span>
          )}
          {todo.status === 'doing' && (
            <span className="text-[10px] text-amber-600">· Bezig</span>
          )}
        </div>
      </button>
    </div>
  );
}

function formatMin(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}u${rem}` : `${h}u`;
}

function groupBy<T>(
  items: T[],
  key: (t: T) => string
): { key: string; label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return Array.from(map.entries()).map(([k, items]) => ({
    key: k,
    label: k,
    items,
  }));
}
