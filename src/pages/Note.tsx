import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Trash2,
  Link2,
  Sparkles,
  Check,
  RotateCcw,
  Wand2,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useTodos, useCreateTodo } from '@/hooks/useTodos';
import { summarizeNote, blockNoteToText, isAIConfigured } from '@/lib/ai';
import NoteEditor from '@/components/note/NoteEditor';
import NoteActionItems from '@/components/note/NoteActionItems';

/** Beschouwt een BlockNote-document als "leeg" als het null is, of bestaat
 *  uit één lege paragraph zonder content. */
function isEmptyBlockNoteContent(content: unknown): boolean {
  if (!content) return true;
  if (!Array.isArray(content)) return true;
  if (content.length === 0) return true;
  if (content.length === 1) {
    const b = content[0] as any;
    const inner = b?.content;
    if (b?.type === 'paragraph' && (!inner || (Array.isArray(inner) && inner.length === 0))) {
      return true;
    }
  }
  return false;
}

export default function NotePage() {
  const { noteId, projectId } = useParams();
  const { data: note, isLoading } = useNote(noteId);
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const createTodo = useCreateTodo();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: todos = [] } = useTodos(
    note?.project_id ? { projectId: note.project_id } : undefined
  );

  const [title, setTitle] = useState('');
  const [tldr, setTldr] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setTldr(note.tldr ?? '');
    }
  }, [note?.id]);

  // Auto-delete bij verlaten: als de notitie nog 'Untitled' is, geen TL;DR en
  // geen content heeft, is hij per ongeluk aangemaakt → opruimen.
  const qc = useQueryClient();
  const latest = useRef<{
    id: string | null;
    title: string;
    tldr: string;
    content: unknown;
  }>({ id: null, title: '', tldr: '', content: null });
  latest.current = {
    id: note?.id ?? null,
    title,
    tldr,
    content: note?.content ?? null,
  };

  useEffect(() => {
    const mountedAt = Date.now();
    return () => {
      // StrictMode dev-mode fires this cleanup direct na mount; sla over.
      if (Date.now() - mountedAt < 300) return;
      const cur = latest.current;
      if (!cur.id) return;
      const titleEmpty =
        !cur.title.trim() || cur.title.trim().toLowerCase() === 'untitled';
      const tldrEmpty = !cur.tldr.trim();
      const contentEmpty = isEmptyBlockNoteContent(cur.content);
      if (titleEmpty && tldrEmpty && contentEmpty) {
        // fire-and-forget; ignore errors (rij was misschien al weg)
        supabase
          .from('notes')
          .delete()
          .eq('id', cur.id)
          .then(() => qc.invalidateQueries({ queryKey: ['notes'] }));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !note) {
    return <div className="p-10 text-sm text-muted">Notitie laden...</div>;
  }

  function saveTitle() {
    if (title.trim() && title !== note!.title) {
      update.mutate({ id: note!.id, patch: { title: title.trim() } });
    }
  }

  function saveTldr() {
    const trimmed = tldr.trim();
    const current = note!.tldr ?? '';
    if (trimmed !== current) {
      update.mutate({
        id: note!.id,
        patch: { tldr: trimmed || null },
      });
    }
  }

  async function handleDelete() {
    if (!confirm('Notitie verwijderen?')) return;
    await remove.mutateAsync(note!.id);
    if (projectId) navigate(`/p/${projectId}`);
    else navigate('/');
  }

  async function handleAISummarize() {
    if (!note) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const noteText = `${note.title}\n\n${blockNoteToText(note.content)}`.trim();
      if (noteText.length < 20) {
        setAiError('Te weinig content om samen te vatten.');
        return;
      }
      const { tldr: aiTldr, action_items } = await summarizeNote(noteText);

      // Update TL;DR if model returned one
      if (aiTldr) {
        setTldr(aiTldr);
        await update.mutateAsync({
          id: note.id,
          patch: { tldr: aiTldr },
        });
      }

      // Create action items sequentially, skip duplicates by title (case-insensitive)
      if (action_items.length > 0) {
        // Fetch current source-note todos to dedupe
        const { data: existing } = await supabase
          .from('todos')
          .select('title')
          .eq('source_note_id', note.id);
        const seen = new Set(
          (existing ?? []).map((t: any) => String(t.title).toLowerCase())
        );
        for (const title of action_items) {
          if (seen.has(title.toLowerCase())) continue;
          await createTodo.mutateAsync({
            title,
            project_id: note.project_id,
            source_note_id: note.id,
            priority: 2,
          });
        }
      }
    } catch (e: any) {
      setAiError(e?.message ?? 'AI-fout');
    } finally {
      setAiBusy(false);
    }
  }

  const linkedProject = projects.find((p) => p.id === note.project_id);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-5 md:py-8">
      {/* Header: back, chips, meta — single row, full width */}
      <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
        <Link
          to={projectId ? `/p/${projectId}` : '/notes'}
          className="text-muted hover:text-text inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          {linkedProject ? linkedProject.title : 'Alle notities'}
        </Link>

        <Link2 size={11} className="text-muted ml-2" />
        <select
          value={note.project_id ?? ''}
          onChange={(e) =>
            update.mutate({
              id: note.id,
              patch: { project_id: e.target.value || null, todo_id: null },
            })
          }
          className="bg-surface2 border border-border rounded-full px-2.5 py-0.5 focus:outline-none hover:border-accent/50 cursor-pointer"
        >
          <option value="">Losse notitie</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              📁 {p.title}
            </option>
          ))}
        </select>
        {note.project_id && (
          <select
            value={note.todo_id ?? ''}
            onChange={(e) =>
              update.mutate({
                id: note.id,
                patch: { todo_id: e.target.value || null },
              })
            }
            className="bg-surface2 border border-border rounded-full px-2.5 py-0.5 focus:outline-none hover:border-accent/50 cursor-pointer max-w-[200px] truncate"
          >
            <option value="">Geen specifieke to-do</option>
            {todos.map((t) => (
              <option key={t.id} value={t.id}>
                ☐ {t.title}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          {note.updated_at && (
            <span className="text-[10px] text-muted tabular-nums">
              {format(parseISO(note.updated_at), 'dd/MM/yy')}
            </span>
          )}
          {isAIConfigured && (
            <button
              onClick={handleAISummarize}
              disabled={aiBusy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-accent border border-accent/30 hover:bg-accent/10 disabled:opacity-50"
              title="Genereer TL;DR + extracteer action-items via Claude"
            >
              {aiBusy ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Wand2 size={11} />
              )}
              AI
            </button>
          )}
          <button
            onClick={() =>
              update.mutate({
                id: note.id,
                patch: { is_done: !note.is_done },
              })
            }
            className={
              note.is_done
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted hover:text-text border border-border hover:bg-surface2'
                : 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-accent border border-accent/30 hover:bg-accent/10'
            }
            title={note.is_done ? 'Heropen' : 'Markeer als klaar'}
          >
            {note.is_done ? (
              <>
                <RotateCcw size={11} /> Heropen
              </>
            ) : (
              <>
                <Check size={11} /> Klaar
              </>
            )}
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded-md text-muted hover:text-red-500 hover:bg-surface2"
            aria-label="Notitie verwijderen"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* AI error toast (inline) */}
      {aiError && (
        <div className="mb-3 text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-1.5">
          AI: {aiError}
        </div>
      )}

      {/* Title — always full-width */}
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
        placeholder="Untitled"
        className="w-full text-2xl md:text-3xl font-semibold tracking-tight bg-transparent focus:outline-none mb-5 placeholder:text-muted/50"
      />

      {/* Layout:
          - Klein scherm (stack): TL;DR → Editor → Action-items
          - xl+ (2-col): Editor links (volle hoogte), rechts TL;DR boven + Action-items eronder
       */}
      <div
        className="
          flex flex-col gap-6
          xl:grid xl:gap-8
          xl:grid-cols-[minmax(0,1fr)_320px]
          xl:grid-rows-[auto_1fr]
        "
      >
        {/* TL;DR — eerst op stacked, rechtsboven op xl+ */}
        <div
          className="
            order-1
            xl:order-none xl:col-start-2 xl:row-start-1
            rounded-md border border-accent/20 bg-accent/5 px-3 py-2
          "
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={10} className="text-accent shrink-0" />
            <span className="text-[10px] uppercase tracking-wider text-accent font-medium">
              TL;DR
            </span>
            <span className="text-[10px] text-muted">
              · de kern, in 1-2 zinnen
            </span>
          </div>
          <textarea
            value={tldr}
            onChange={(e) => setTldr(e.target.value)}
            onBlur={saveTldr}
            placeholder="Schrijf hem zo dat je 'm over 3 maanden nog snapt zonder de rest te lezen."
            rows={2}
            className="w-full bg-transparent text-sm focus:outline-none resize-none placeholder:text-muted/60 leading-relaxed"
            style={{ minHeight: '2.5rem', height: 'auto', overflow: 'hidden' }}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
          />
        </div>

        {/* Editor — midden op stacked, linkerkolom (volledige hoogte) op xl+
            Key op note.id forceert remount bij switchen tussen notities zodat
            BlockNote met de juiste initialContent opnieuw initialiseert. */}
        <div
          className="
            order-2
            xl:order-none xl:col-start-1 xl:row-start-1 xl:row-span-2
            min-w-0
          "
        >
          <NoteEditor
            key={note.id}
            initialContent={note.content}
            onChange={(content) =>
              update.mutate({ id: note.id, patch: { content } })
            }
          />
        </div>

        {/* Action-items — onderaan op stacked, rechtsonder op xl+ */}
        <div
          className="
            order-3
            xl:order-none xl:col-start-2 xl:row-start-2
          "
        >
          <NoteActionItems note={note} />
        </div>
      </div>
    </div>
  );
}
