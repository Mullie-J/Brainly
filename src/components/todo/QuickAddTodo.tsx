import { useEffect, useState } from 'react';
import { useUI } from '@/store/ui';
import { useProjects } from '@/hooks/useProjects';
import { useCreateTodo } from '@/hooks/useTodos';
import type { Priority, Scope } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import DateChip from './DateChip';

export default function QuickAddTodo() {
  const { quickAddOpen, quickAddProjectId, closeQuickAdd } = useUI();
  const { data: projects = [] } = useProjects();
  const create = useCreateTodo();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>(2);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('work');

  useEffect(() => {
    if (quickAddOpen) {
      setTitle('');
      setPriority(2);
      setDueDate(null);
      setScope('work');
      setProjectId(quickAddProjectId ?? null);
    }
  }, [quickAddOpen, quickAddProjectId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && quickAddOpen) closeQuickAdd();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickAddOpen, closeQuickAdd]);

  if (!quickAddOpen) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      project_id: scope === 'personal' ? null : projectId,
      priority,
      due_date: dueDate,
      scope,
    });
    closeQuickAdd();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/30"
      onClick={closeQuickAdd}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface rounded-xl border border-border shadow-xl overflow-hidden"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wat moet er gebeuren?"
          className="w-full px-4 py-3 bg-transparent text-base focus:outline-none border-b border-border"
        />
        <div className="flex items-center gap-2 p-3 flex-wrap">
          {/* Scope toggle */}
          <div className="flex items-center gap-0.5 bg-surface2/50 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setScope('work')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                scope === 'work' ? 'bg-surface shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              💼 Werk
            </button>
            <button
              type="button"
              onClick={() => setScope('personal')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                scope === 'personal' ? 'bg-surface shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              🏡 Privé
            </button>
          </div>

          {scope === 'work' && (
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value || null)}
              className="text-sm bg-surface2 border border-border rounded-md px-2 py-1.5 focus:outline-none"
            >
              <option value="">📥 Inbox</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            {([1, 2, 3] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                  priority === p
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-muted hover:text-text'
                }`}
              >
                P{p}
              </button>
            ))}
          </div>
          <DateChip value={dueDate} onChange={setDueDate} size="md" />
          <button
            type="submit"
            disabled={!title.trim() || create.isPending}
            className="ml-auto text-sm px-3 py-1.5 rounded-md bg-accent text-white font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            Toevoegen
          </button>
        </div>
      </form>
    </div>
  );
}
