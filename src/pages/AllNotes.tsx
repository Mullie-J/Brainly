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
    <div className="page page-wide">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <StickyNote size={11} /> Notities
          </div>
          <h1 className="page-title">Alle notities</h1>
          <p className="page-sub">
            <span className="tabular">{sorted.length}</span>{' '}
            {sorted.length === 1 ? 'notitie' : 'notities'}
            {filtered.length !== notes.length && (
              <>
                {' '}· <span className="tabular">{notes.length}</span> totaal
              </>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={handleNew}
            disabled={createNote.isPending}
            className="btn btn-primary"
          >
            {createNote.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Nieuwe notitie
          </button>
        </div>
      </header>

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
      <div className="toolbar">
        <div className="seg">
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={clsx('seg-btn', scope === s.id && 'on')}
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
        <div className="empty-card">
          <p style={{ marginBottom: 12 }}>
            {query || scope !== 'all' || projectFilter !== 'all'
              ? 'Geen notities in deze view.'
              : 'Nog geen notities.'}
          </p>
          {!query && scope === 'open' && projectFilter === 'all' && (
            <button onClick={handleNew} className="btn btn-primary">
              <Plus size={14} /> Maak je eerste notitie
            </button>
          )}
        </div>
      ) : (
        <div className="notes-grid">
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
      className="note-card"
      style={note.is_done ? { opacity: 0.65 } : undefined}
    >
      <div className="note-card-head">
        <h3 className="note-card-title">{note.title || 'Untitled'}</h3>
        <span className="muted-text font-mono-tight tabular">{updatedStr}</span>
      </div>

      {note.tldr ? (
        <div className="note-tldr">
          <Sparkles size={11} className="note-tldr-tag" />
          <p style={{ margin: 0 }} className="note-body">
            {note.tldr}
          </p>
        </div>
      ) : (
        <p className="muted-text" style={{ fontSize: 12, fontStyle: 'italic', margin: 0 }}>
          Nog geen TL;DR ingevuld.
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {note.is_done && (
          <span className="chip" style={{ color: 'rgb(var(--emerald))' }}>
            ✓ klaar
          </span>
        )}
        {project && (
          <span className="proj-chip">
            <FolderKanban size={10} />
            <span className="proj-chip-label">{project.title}</span>
          </span>
        )}
        {todo && (
          <span className="proj-chip">
            <CheckSquare size={10} />
            <span className="proj-chip-label">{todo.title}</span>
          </span>
        )}
        {!project && !todo && !note.is_done && (
          <span className="meta-inbox">Los</span>
        )}
        {reviewedStr && (
          <span className="muted-text font-mono-tight" style={{ marginLeft: 'auto' }}>
            <Repeat size={9} style={{ display: 'inline', marginRight: 2 }} />
            {reviewedStr} · {note.review_interval_days}d
          </span>
        )}
      </div>
    </Link>
  );
}
