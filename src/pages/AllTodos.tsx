import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  ChevronDown,
  Flame,
  Repeat,
  Square,
  CheckSquare,
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useTodos, useUpdateTodo } from '@/hooks/useTodos';
import {
  useBulkDeleteTodosWithUndo,
  useBulkUpdateTodos,
} from '@/hooks/useTodoActions';
import { useProjects } from '@/hooks/useProjects';
import { useUI } from '@/store/ui';
import { useTodoContextMenu } from '@/hooks/useTodoContextMenu';
import PriorityBadge from '@/components/todo/PriorityBadge';
import BulkActionBar from '@/components/todo/BulkActionBar';
import type { Todo, TodoStatus, Priority } from '@/lib/types';

type SortKey = 'priority' | 'due_date' | 'recent' | 'status';
type StatusFilter = 'open' | 'done' | 'all';
type ProjectFilter = 'all' | 'none' | string;

const STATUS_LABEL: Record<TodoStatus, string> = {
  todo: 'Te doen',
  doing: 'Bezig',
  done: 'Klaar',
};
const STATUS_ORDER: Record<TodoStatus, number> = { doing: 0, todo: 1, done: 2 };

function formatMin(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}u${rem}` : `${h}u`;
}

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
        const ad = a.due_date ?? '9999-12-31';
        const bd = b.due_date ?? '9999-12-31';
        if (ad !== bd) return ad.localeCompare(bd);
        return a.priority - b.priority;
      }
      if (sort === 'status') {
        if (a.status !== b.status)
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return a.priority - b.priority;
      }
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [filtered, sort]);

  const groups = useMemo(() => {
    if (sort === 'priority') return groupBy(sorted, (t) => `P${t.priority}`);
    if (sort === 'status')
      return groupBy(sorted, (t) => STATUS_LABEL[t.status]);
    if (sort === 'due_date') {
      return groupBy(sorted, (t) => {
        if (!t.due_date) return 'Geen datum';
        const d = parseISO(t.due_date);
        if (isPast(d) && !isToday(d)) return 'Overtijd';
        if (isToday(d)) return 'Vandaag';
        return format(d, 'd MMM yyyy', { locale: nl });
      });
    }
    return [{ key: '', label: '', items: sorted }];
  }, [sorted, sort]);

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <ListTodo size={11} /> Backlog
          </div>
          <h1 className="page-title">Alle to-do's</h1>
          <p className="page-sub">
            <span className="tabular">{sorted.length}</span>{' '}
            {sorted.length === 1 ? 'item' : 'items'}
            {filtered.length !== todos.length && (
              <>
                {' '}
                · <span className="tabular">{todos.length}</span> totaal
              </>
            )}
            {unassignedCount > 0 && projectFilter !== 'none' && (
              <>
                {' '}
                ·{' '}
                <button
                  onClick={() => setProjectFilter('none')}
                  style={{
                    color: 'rgb(var(--amber))',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {unassignedCount} zonder project
                </button>
              </>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button onClick={() => openQuickAdd()} className="btn btn-primary">
            <Plus size={14} /> To-do
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="seg">
          {(['open', 'done', 'all'] as StatusFilter[]).map((k) => (
            <button
              key={k}
              className={clsx('seg-btn', statusFilter === k && 'on')}
              onClick={() => setStatusFilter(k)}
            >
              {k === 'open' ? 'Open' : k === 'done' ? 'Klaar' : 'Alles'}
            </button>
          ))}
        </div>
        <div className="select-wrap">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value as ProjectFilter)}
          >
            <option value="all">Alle projecten</option>
            <option value="none">📥 Zonder project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="select-chev" />
        </div>
        <div className="toolbar-spacer" />
        <div className="select-wrap">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="priority">Sorteer op prioriteit</option>
            <option value="due_date">Sorteer op deadline</option>
            <option value="status">Sorteer op status</option>
            <option value="recent">Sorteer op recent</option>
          </select>
          <ChevronDown size={11} className="select-chev" />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-card">
          <p>Geen to-do's in deze view.</p>
        </div>
      ) : (
        <div className="row-groups">
          {groups.map((g) => (
            <section key={g.key}>
              {g.label && (
                <h2 className="section-title">
                  {g.label}
                  <span className="section-count tabular">{g.items.length}</span>
                </h2>
              )}
              <div className="row-list">
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
}: {
  todo: Todo;
  project: any;
  selected: boolean;
  selectionActive: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onPriority: (p: Priority) => void;
}) {
  const openTodo = useUI((s) => s.openTodo);
  const { contextMenuProps, menu } = useTodoContextMenu(todo);
  return (
    <>
    <div
      className={clsx('row', todo.status === 'done' && 'row-done')}
      style={
        selected
          ? {
              borderColor: 'rgb(var(--accent-rgb) / 0.6)',
              background: 'rgb(var(--accent-rgb) / 0.04)',
            }
          : undefined
      }
      {...contextMenuProps}
    >
      <button
        onClick={onSelect}
        aria-label={selected ? 'Deselecteer' : 'Selecteer'}
        className="check"
        style={{
          opacity: selected || selectionActive ? 1 : 0,
          transition: 'opacity 0.12s',
          color: selected ? 'var(--accent)' : 'rgb(var(--muted))',
        }}
        onFocus={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {selected ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>
      <button onClick={onToggle} className="check" aria-label="Toggle">
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
          <PriorityBadge priority={todo.priority} onChange={onPriority} />
          {todo.due_date && (
            <span
              className={clsx(
                'chip',
                isToday(parseISO(todo.due_date)) && 'chip-today',
                isPast(parseISO(todo.due_date)) &&
                  !isToday(parseISO(todo.due_date)) &&
                  'chip-overdue'
              )}
            >
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
    {menu}
    </>
  );
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
