import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  X,
  Trash2,
  CheckCircle2,
  Circle,
  Flame,
  Repeat,
  StickyNote,
  Plus,
  ExternalLink,
  Link2,
  Search,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { Todo, Priority, TodoStatus, RecurrenceType, Scope, Note } from '@/lib/types';
import { useUpdateTodo, useDeleteTodo } from '@/hooks/useTodos';
import { useProjects } from '@/hooks/useProjects';
import { useNotes, useCreateNote, useUpdateNote } from '@/hooks/useNotes';
import { useUI } from '@/store/ui';
import PriorityBadge from './PriorityBadge';
import DateChip from './DateChip';

const STATUS_OPTIONS: { id: TodoStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'Te doen', color: 'border-border text-muted' },
  { id: 'doing', label: 'Bezig', color: 'border-amber-500/40 text-amber-600 bg-amber-500/10' },
  { id: 'done', label: 'Klaar', color: 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10' },
];

const SCOPE_OPTIONS: { id: Scope; label: string; emoji: string }[] = [
  { id: 'work', label: 'Werk', emoji: '💼' },
  { id: 'personal', label: 'Privé', emoji: '🏡' },
];

const EFFORT_PRESETS: { label: string; minutes: number }[] = [
  { label: 'XS', minutes: 15 },
  { label: 'S', minutes: 30 },
  { label: 'M', minutes: 60 },
  { label: 'L', minutes: 120 },
  { label: 'XL', minutes: 240 },
];

const RECURRENCE_OPTIONS: { id: RecurrenceType | 'none'; label: string }[] = [
  { id: 'none', label: 'Eenmalig' },
  { id: 'daily', label: 'Dagelijks' },
  { id: 'weekdays', label: 'Werkdagen' },
  { id: 'weekly', label: 'Wekelijks' },
  { id: 'monthly', label: 'Maandelijks' },
];

function useTodo(id: string | null) {
  return useQuery({
    queryKey: ['todo', id],
    enabled: !!id,
    queryFn: async (): Promise<Todo | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as Todo) ?? null;
    },
  });
}

export default function TodoDetail() {
  const openTodoId = useUI((s) => s.openTodoId);
  const closeTodo = useUI((s) => s.closeTodo);
  const { data: todo } = useTodo(openTodoId);
  const { data: projects = [] } = useProjects();
  const { data: linkedNotes = [] } = useNotes(
    openTodoId ? { todoId: openTodoId } : undefined
  );
  const { data: allNotes = [] } = useNotes();
  const update = useUpdateTodo();
  const remove = useDeleteTodo();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description ?? '');
    }
  }, [todo?.id]);

  // Close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && openTodoId) closeTodo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openTodoId, closeTodo]);

  const project = useMemo(
    () => todo?.project_id ? projects.find((p) => p.id === todo.project_id) : null,
    [todo?.project_id, projects]
  );

  const linkedIds = useMemo(
    () => new Set(linkedNotes.map((n) => n.id)),
    [linkedNotes]
  );
  const pickable = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return allNotes
      .filter((n) => !linkedIds.has(n.id))
      .filter((n) => {
        if (!q) return true;
        const hay = `${n.title} ${n.tldr ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [allNotes, linkedIds, pickerQuery]);

  if (!openTodoId || !todo) return null;

  function patch(p: Parameters<typeof update.mutate>[0]['patch']) {
    update.mutate({ id: todo!.id, patch: p });
  }

  function saveTitle() {
    if (title.trim() && title !== todo!.title) {
      patch({ title: title.trim() });
    } else if (!title.trim()) {
      setTitle(todo!.title);
    }
  }

  function saveDescription() {
    const t = description.trim();
    if (t !== (todo!.description ?? '')) {
      patch({ description: t || null });
    }
  }

  async function handleDelete() {
    if (!confirm(`To-do "${todo!.title}" verwijderen?`)) return;
    await remove.mutateAsync(todo!.id);
    closeTodo();
  }

  async function handleAddNote() {
    const note = await createNote.mutateAsync({
      title: `Notitie bij: ${todo!.title}`,
      todo_id: todo!.id,
      project_id: todo!.project_id,
    });
    closeTodo();
    const url = todo!.project_id
      ? `/p/${todo!.project_id}/n/${note.id}`
      : `/n/${note.id}`;
    window.location.href = url;
  }

  function handleLinkNote(noteId: string) {
    updateNote.mutate({
      id: noteId,
      patch: { todo_id: todo!.id, project_id: todo!.project_id },
    });
    setPicker(false);
    setPickerQuery('');
  }

  function handleUnlinkNote(noteId: string) {
    updateNote.mutate({
      id: noteId,
      patch: { todo_id: null },
    });
  }

  return (
    <div className="td-shroud" onClick={closeTodo}>
      <aside className="td" onClick={(e) => e.stopPropagation()}>
        <div className="td-head">
          <button
            onClick={() =>
              patch({ status: todo.status === 'done' ? 'todo' : 'done' })
            }
            className="check"
            aria-label="Toggle done"
          >
            {todo.status === 'done' ? (
              <CheckCircle2 size={20} />
            ) : (
              <Circle size={20} />
            )}
          </button>
          <span className="page-eyebrow" style={{ margin: 0, flex: 1, minWidth: 0 }}>
            {project ? (
              <Link
                to={`/p/${project.id}`}
                onClick={closeTodo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {project.title} <ExternalLink size={10} />
              </Link>
            ) : (
              <span style={{ fontStyle: 'italic' }}>Zonder project</span>
            )}
          </span>
          <button onClick={handleDelete} className="btn btn-ghost" aria-label="Verwijder">
            <Trash2 size={14} />
          </button>
          <button onClick={closeTodo} className="btn btn-ghost" aria-label="Sluit">
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Wat moet er gebeuren?"
            className={clsx('td-title', todo.status === 'done' && 'strike')}
            style={{ background: 'transparent', border: 'none' }}
          />

          {/* Meta chips row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status pills */}
            <div className="flex items-center gap-0.5 bg-surface2/50 rounded-full p-0.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => patch({ status: s.id })}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    todo.status === s.id
                      ? `${s.color} border bg-surface shadow-sm`
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Scope toggle */}
            <div className="flex items-center gap-0.5 bg-surface2/50 rounded-full p-0.5">
              {SCOPE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => patch({ scope: s.id })}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    todo.scope === s.id
                      ? 'bg-surface text-text shadow-sm'
                      : 'text-muted hover:text-text'
                  }`}
                  title={s.label}
                >
                  <span className="mr-1">{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>

            <PriorityBadge
              priority={todo.priority}
              onChange={(p: Priority) => patch({ priority: p })}
              size="sm"
            />

            <DateChip
              value={todo.due_date}
              onChange={(due_date) => patch({ due_date })}
              size="md"
            />

            {/* Project select */}
            <select
              value={todo.project_id ?? ''}
              onChange={(e) =>
                patch({ project_id: e.target.value || null })
              }
              className="text-xs bg-surface border border-border rounded-full px-2.5 py-1 hover:border-accent/50 focus:outline-none cursor-pointer"
            >
              <option value="">📥 Zonder project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5 block">
              Beschrijving
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Context · eerste stap · links · "
              rows={3}
              className="w-full bg-surface2/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Effort */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5 flex items-center gap-1.5">
              <Flame size={11} /> Effort-inschatting
              {todo.effort_min && (
                <span className="ml-1 text-muted normal-case font-normal">
                  · {formatMinutes(todo.effort_min)}
                </span>
              )}
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {EFFORT_PRESETS.map((e) => (
                <button
                  key={e.label}
                  onClick={() =>
                    patch({
                      effort_min: todo.effort_min === e.minutes ? null : e.minutes,
                    })
                  }
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    todo.effort_min === e.minutes
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {e.label}
                  <span className="ml-1 text-[10px] opacity-70 tabular-nums">
                    {formatMinutes(e.minutes)}
                  </span>
                </button>
              ))}
              <input
                type="number"
                min={1}
                step={5}
                value={todo.effort_min ?? ''}
                onChange={(e) =>
                  patch({
                    effort_min: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                placeholder="min"
                className="w-16 text-xs bg-surface border border-border rounded-md px-2 py-1 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5 flex items-center gap-1.5">
              <Repeat size={11} /> Herhaling
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {RECURRENCE_OPTIONS.map((r) => {
                const active =
                  r.id === 'none'
                    ? !todo.recurrence_type
                    : todo.recurrence_type === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      patch({
                        recurrence_type: r.id === 'none' ? null : r.id,
                      })
                    }
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      active
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-border text-muted hover:text-text'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {todo.recurrence_type && (
              <p className="text-[10px] text-muted mt-1.5 italic">
                Bij afvinken wordt automatisch de volgende instantie aangemaakt.
              </p>
            )}
          </div>

          {/* Linked notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
                <StickyNote size={11} /> Notities
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPicker((p) => !p);
                    setPickerQuery('');
                  }}
                  className="text-xs text-muted hover:text-text inline-flex items-center gap-1"
                >
                  <Link2 size={11} /> Koppel bestaande
                </button>
                <button
                  onClick={handleAddNote}
                  className="text-xs text-muted hover:text-text inline-flex items-center gap-1"
                >
                  <Plus size={11} /> Nieuwe notitie
                </button>
              </div>
            </div>

            {/* Picker for existing notes */}
            {picker && (
              <div className="mb-2 bg-surface2/30 border border-border rounded-md overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <Search size={12} className="text-muted" />
                  <input
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Zoek notitie op titel of TL;DR..."
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => setPicker(false)}
                    className="text-muted hover:text-text"
                    aria-label="Sluit picker"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {pickable.length === 0 ? (
                    <p className="text-xs text-muted italic px-3 py-3">
                      {pickerQuery
                        ? 'Geen resultaten.'
                        : 'Geen koppelbare notities.'}
                    </p>
                  ) : (
                    pickable.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleLinkNote(n.id)}
                        className="w-full text-left px-3 py-2 hover:bg-surface2 transition-colors border-b border-border last:border-b-0"
                      >
                        <div className="text-sm font-medium truncate">
                          {n.title || 'Untitled'}
                        </div>
                        {n.tldr && (
                          <div className="text-[11px] text-muted truncate mt-0.5">
                            {n.tldr.slice(0, 60)}
                            {n.tldr.length > 60 ? '…' : ''}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {linkedNotes.length === 0 ? (
              <p className="text-xs text-muted italic py-1">
                Nog geen notities gekoppeld.
              </p>
            ) : (
              <div className="space-y-1.5">
                {linkedNotes.map((n) => (
                  <LinkedNoteRow
                    key={n.id}
                    note={n}
                    onOpen={closeTodo}
                    onUnlink={() => handleUnlinkNote(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}u${rem}` : `${h}u`;
}

function LinkedNoteRow({
  note,
  onOpen,
  onUnlink,
}: {
  note: Note;
  onOpen: () => void;
  onUnlink: () => void;
}) {
  const href = note.project_id
    ? `/p/${note.project_id}/n/${note.id}`
    : `/n/${note.id}`;
  let updated = '';
  try {
    if (note.updated_at) {
      const d = parseISO(note.updated_at);
      if (!isNaN(d.getTime())) {
        updated = format(d, 'dd/MM/yy');
      }
    }
  } catch {
    updated = '';
  }

  return (
    <div className="group flex items-start gap-2 px-3 py-2 bg-surface2/40 border border-border rounded-md hover:border-accent/40 transition-colors">
      <StickyNote size={12} className="text-muted shrink-0 mt-1" />
      <Link to={href} onClick={onOpen} className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {note.title || 'Untitled'}
        </div>
        {note.tldr && (
          <div className="text-[11px] text-muted mt-0.5 flex items-start gap-1">
            <Sparkles size={9} className="text-accent shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{note.tldr}</span>
          </div>
        )}
        <div className="text-[10px] text-muted mt-0.5">{updated}</div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnlink();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 p-1 shrink-0"
        title="Ontkoppel notitie"
      >
        <X size={11} />
      </button>
    </div>
  );
}
