import { useMemo, useState } from 'react';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Circle,
  Loader2,
  Download,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from '@/hooks/useTodos';
import { useUI } from '@/store/ui';
import PriorityBadge from '@/components/todo/PriorityBadge';
import type { Note } from '@/lib/types';

interface Props {
  note: Note;
}

// Loop door BlockNote document JSON en pak alle list-items als tekst.
function extractInline(content: any): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((part: any) => {
      if (typeof part === 'string') return part;
      if (part?.text) return part.text;
      if (Array.isArray(part?.content)) return extractInline(part.content);
      return '';
    })
    .join('')
    .trim();
}

// Alleen checkListItem-blokken (☐ checkboxes) tellen als action-item.
// Gewone bullets en genummerde lijsten zijn meestal content, geen to-do's.
// Already-checked items worden overgeslagen.
function detectListItems(blocks: any): string[] {
  const out: string[] = [];
  function walk(arr: any) {
    if (!Array.isArray(arr)) return;
    for (const b of arr) {
      if (b?.type === 'checkListItem' && !b.props?.checked) {
        const t = extractInline(b.content);
        if (t) out.push(t);
      }
      if (Array.isArray(b?.children)) walk(b.children);
    }
  }
  walk(blocks);
  return out;
}

export default function NoteActionItems({ note }: Props) {
  const { data: items = [] } = useTodos({ sourceNoteId: note.id });
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const remove = useDeleteTodo();
  const openTodo = useUI((s) => s.openTodo);
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);

  const open = items.filter((t) => t.status !== 'done');
  const done = items.filter((t) => t.status === 'done');

  // Detecteer importeerbare bullets/checkboxes uit de note content
  // die nog niet als action-item bestaan.
  const importable = useMemo(() => {
    const detected = detectListItems(note.content);
    const existing = new Set(items.map((i) => i.title.toLowerCase()));
    return detected.filter((t) => !existing.has(t.toLowerCase()));
  }, [note.content, items]);

  async function importFromNote() {
    if (importable.length === 0) return;
    setImporting(true);
    try {
      for (const title of importable) {
        await create.mutateAsync({
          title,
          project_id: note.project_id,
          source_note_id: note.id,
          priority: 2,
        });
      }
    } finally {
      setImporting(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await create.mutateAsync({
      title: text.trim(),
      project_id: note.project_id,
      source_note_id: note.id,
      priority: 2,
    });
    setText('');
  }

  // Strip veel-voorkomende bullet/checkbox/nummer-prefixes zodat copy-paste
  // uit notes/markdown direct schone titels oplevert.
  function stripBulletPrefix(line: string): string {
    return line
      .replace(/^[\s]*[-*•·▪◦]\s+/, '')         // - * • · etc.
      .replace(/^[\s]*\d+[.)]\s+/, '')            // 1. of 2)
      .replace(/^[\s]*\[[ xX✓✗·]\]\s+/, '')       // [ ] [x] etc.
      .trim();
  }

  async function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text');
    const lines = pasted
      .split(/\r?\n/)
      .map(stripBulletPrefix)
      .filter((l) => l.length > 0);
    if (lines.length <= 1) return;  // Default paste afhandelen
    e.preventDefault();
    setText('');
    // Inserts sequentieel zodat React Query optimistisch refresht zonder
    // race-conditions met de gedeelde lijst.
    for (const title of lines) {
      await create.mutateAsync({
        title,
        project_id: note.project_id,
        source_note_id: note.id,
        priority: 2,
      });
    }
  }

  return (
    <section className="rounded-md border border-border bg-surface2/30 p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-1.5">
          <CheckSquare size={12} /> Actie-items uit deze notitie
          {items.length > 0 && (
            <span className="text-muted/70 tabular-nums">
              {open.length}/{items.length}
            </span>
          )}
        </h2>
        {importable.length > 0 && (
          <button
            onClick={importFromNote}
            disabled={importing}
            className="text-xs text-accent hover:underline inline-flex items-center gap-1 disabled:opacity-50"
            title="Pakt automatisch bullets en checklists uit deze notitie"
          >
            {importing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Download size={11} />
            )}
            Importeer {importable.length} uit notitie
          </button>
        )}
      </div>

      {/* Quick-add input */}
      <form onSubmit={add} className="mb-3">
        <div className="relative">
          <Plus
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder="Wat moet er gebeuren? (Enter · plak meerdere regels voor batch)"
            disabled={create.isPending}
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-md focus:outline-none focus:border-accent placeholder:text-muted/60 disabled:opacity-50"
          />
          {create.isPending && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin"
            />
          )}
        </div>
      </form>

      {/* Items */}
      {items.length === 0 ? (
        <p className="text-xs text-muted italic py-2">
          Nog geen actie-items. Tip: typ ze hier in plaats van in de tekst,
          dan komen ze ook in je agenda/Top 3.
        </p>
      ) : (
        <div className="space-y-1">
          {open.map((t) => (
            <Row
              key={t.id}
              todo={t}
              onToggle={() =>
                update.mutate({
                  id: t.id,
                  patch: { status: 'done' },
                })
              }
              onOpen={() => openTodo(t.id)}
              onDelete={() => remove.mutate(t.id)}
            />
          ))}
          {done.length > 0 && (
            <details className="mt-3">
              <summary className="text-[11px] text-muted cursor-pointer hover:text-text select-none">
                {done.length} klaar
              </summary>
              <div className="mt-1.5 space-y-1">
                {done.map((t) => (
                  <Row
                    key={t.id}
                    todo={t}
                    onToggle={() =>
                      update.mutate({
                        id: t.id,
                        patch: { status: 'todo' },
                      })
                    }
                    onOpen={() => openTodo(t.id)}
                    onDelete={() => remove.mutate(t.id)}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function Row({
  todo,
  onToggle,
  onOpen,
  onDelete,
}: {
  todo: any;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const done = todo.status === 'done';
  return (
    <div className="group flex items-start gap-2.5 px-3 py-1.5 bg-surface border border-border rounded-md text-sm hover:border-accent/40 transition-colors">
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0 text-muted hover:text-accent"
        aria-label="Toggle done"
      >
        {done ? (
          <CheckCircle2 size={14} className="text-accent" />
        ) : (
          <Circle size={14} />
        )}
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className={clsx('truncate', done && 'line-through text-muted')}>
          {todo.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <PriorityBadge priority={todo.priority} size="xs" />
          {todo.due_date && (
            <span className="text-[10px] text-muted tabular-nums">
              {format(parseISO(todo.due_date), 'dd/MM/yy')}
            </span>
          )}
          {todo.scope === 'personal' && (
            <span className="text-[10px] text-emerald-600">🏡</span>
          )}
        </div>
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 p-1 shrink-0 transition-opacity"
        aria-label="Verwijder action-item"
        title="Verwijder action-item"
      >
        <X size={12} />
      </button>
    </div>
  );
}
