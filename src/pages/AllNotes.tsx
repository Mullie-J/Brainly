import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  Search,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  Loader2,
  CheckSquare,
  FolderKanban,
  Repeat,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { useNotes, useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useTodos } from '@/hooks/useTodos';
import type { Note } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

type SortKey = 'updated' | 'created' | 'title' | 'reviewed';
type Scope = 'open' | 'done' | 'all';

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'updated', label: 'Recent bewerkt' },
  { id: 'created', label: 'Aangemaakt' },
  { id: 'title', label: 'Titel (A-Z)' },
  { id: 'reviewed', label: 'Laatst gereviewd' },
];

const SCOPE_OPTIONS: { id: Scope; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Klaar' },
  { id: 'all', label: 'Alles' },
];

export default function AllNotes() {
  const { data: notes = [], isLoading } = useNotes();
  const { data: projects = [] } = useProjects();
  const { data: todos = [] } = useTodos();
  const createNote = useCreateNote();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('open');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('updated');

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const todoMap = useMemo(
    () => new Map(todos.map((t) => [t.id, t])),
    [todos]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (scope === 'open' && n.is_done) return false;
      if (scope === 'done' && !n.is_done) return false;
      if (projectFilter === 'none' && n.project_id) return false;
      if (
        projectFilter !== 'all' &&
        projectFilter !== 'none' &&
        n.project_id !== projectFilter
      )
        return false;
      if (q) {
        const hay = `${n.title} ${n.tldr ?? ''} ${n.body_text ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notes, scope, projectFilter, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sort === 'created') return b.created_at.localeCompare(a.created_at);
      if (sort === 'reviewed') {
        const ar = a.last_reviewed_at ?? '0';
        const br = b.last_reviewed_at ?? '0';
        return br.localeCompare(ar);
      }
      return b.updated_at.localeCompare(a.updated_at);
    });
    return list;
  }, [filtered, sort]);

  async function handleNew() {
    const note = await createNote.mutateAsync({});
    navigate(`/n/${note.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface2 flex items-center justify-center">
            <StickyNote size={18} className="text-muted" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notities</h1>
            <p className="text-xs text-muted">
              {sorted.length} {sorted.length === 1 ? 'notitie' : 'notities'}
              {filtered.length !== notes.length && (
                <> · {notes.length} totaal</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleNew}
          disabled={createNote.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {createNote.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Nieuwe notitie
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op titel of TL;DR..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Scope pills */}
        <div className="flex items-center gap-0.5 bg-surface2/50 rounded-full p-0.5">
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={clsx(
                'text-xs px-2.5 py-1 rounded-full transition-colors',
                scope === s.id
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
            onChange={(e) => setProjectFilter(e.target.value)}
            className="appearance-none text-xs pl-3 pr-8 py-1.5 bg-surface border border-border rounded-full hover:border-accent/50 focus:outline-none cursor-pointer"
          >
            <option value="all">Alle projecten</option>
            <option value="none">📥 Geen project</option>
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

      {/* Notes list */}
      {isLoading ? (
        <p className="text-sm text-muted">Laden...</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted mb-2">
            {query || scope !== 'all' || projectFilter !== 'all'
              ? 'Geen notities in deze view.'
              : 'Nog geen notities.'}
          </p>
          {!query && scope === 'open' && projectFilter === 'all' && (
            <button
              onClick={handleNew}
              className="text-sm text-accent hover:underline inline-flex items-center gap-1"
            >
              <Plus size={14} /> Maak je eerste notitie
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              project={n.project_id ? projectMap.get(n.project_id) : null}
              todo={n.todo_id ? todoMap.get(n.todo_id) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  project,
  todo,
}: {
  note: Note;
  project: any;
  todo: any;
}) {
  const href = note.project_id
    ? `/p/${note.project_id}/n/${note.id}`
    : `/n/${note.id}`;

  let updatedStr = '';
  let reviewedStr: string | null = null;
  try {
    updatedStr = format(parseISO(note.updated_at), 'dd/MM/yy');
    if (note.last_reviewed_at) {
      reviewedStr = format(parseISO(note.last_reviewed_at), 'dd/MM/yy');
    }
  } catch {
    /* ignore */
  }

  return (
    <Link
      to={href}
      className={clsx(
        'group block bg-surface border rounded-lg p-4 hover:shadow-sm transition-all',
        note.is_done
          ? 'border-border opacity-60 hover:opacity-100 hover:border-accent/50'
          : 'border-border hover:border-accent/50'
      )}
    >
      {/* Meta header */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted mb-1.5 flex-wrap">
        {note.is_done && (
          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
            ✓ Klaar
          </span>
        )}
        {project && (
          <span className="inline-flex items-center gap-1 text-muted">
            <FolderKanban size={10} />
            <span className="truncate max-w-[160px]">{project.title}</span>
          </span>
        )}
        {todo && (
          <span className="inline-flex items-center gap-1 text-muted">
            <CheckSquare size={10} />
            <span className="truncate max-w-[160px]">{todo.title}</span>
          </span>
        )}
        {!project && !todo && !note.is_done && (
          <span className="italic">Los</span>
        )}
        <span className="ml-auto tabular-nums">{updatedStr}</span>
      </div>

      {/* Title */}
      <h3 className="font-semibold tracking-tight text-base mb-2 line-clamp-2 group-hover:text-accent transition-colors">
        {note.title || 'Untitled'}
      </h3>

      {/* TL;DR */}
      {note.tldr ? (
        <div className="text-sm text-text/80 flex items-start gap-1.5 mb-2">
          <Sparkles size={11} className="text-accent shrink-0 mt-1" />
          <p className="line-clamp-4 leading-relaxed whitespace-pre-wrap">
            {note.tldr}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted italic">Nog geen TL;DR ingevuld.</p>
      )}

      {/* Review status */}
      {reviewedStr && (
        <div className="flex items-center gap-1 text-[10px] text-muted mt-2 pt-2 border-t border-border">
          <Repeat size={9} />
          Gereviewd {reviewedStr} · interval {note.review_interval_days}d
        </div>
      )}
    </Link>
  );
}
