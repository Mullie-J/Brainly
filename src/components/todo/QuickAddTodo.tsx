import { useEffect, useState } from 'react';
import { useUI } from '@/store/ui';
import { useProjects } from '@/hooks/useProjects';
import { useCreateTodo } from '@/hooks/useTodos';
import type { Priority, Scope } from '@/lib/types';
import { Loader2, Plus, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { format, addDays, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

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

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  return (
    <div className="qa-shroud" onClick={closeQuickAdd}>
      <form className="qa" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="qa-head">
          <span className="qa-eyebrow">// snelle to-do</span>
          <kbd className="kbd">↵ opslaan · esc</kbd>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wat moet er gebeuren?"
          className="qa-title"
          style={{ background: 'transparent' }}
        />
        <div className="qa-controls">
          <div className="qa-group">
            <span className="qa-label font-mono-tight">scope</span>
            <div className="seg">
              <button
                type="button"
                onClick={() => setScope('work')}
                className={clsx('seg-btn', scope === 'work' && 'on')}
              >
                💼 Werk
              </button>
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={clsx('seg-btn', scope === 'personal' && 'on')}
              >
                🏡 Privé
              </button>
            </div>
          </div>

          <div className="qa-group">
            <span className="qa-label font-mono-tight">prioriteit</span>
            <div className="seg">
              {([1, 2, 3] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={clsx(
                    'seg-btn',
                    `pri-seg-${p}`,
                    priority === p && 'on'
                  )}
                >
                  P{p}
                </button>
              ))}
            </div>
          </div>

          <div className="qa-group">
            <span className="qa-label font-mono-tight">deadline</span>
            <div className="qa-dates">
              <button
                type="button"
                onClick={() => setDueDate(ymd(today))}
                className={clsx('pill', dueDate === ymd(today) && 'on')}
              >
                Vandaag
              </button>
              <button
                type="button"
                onClick={() => setDueDate(ymd(tomorrow))}
                className={clsx('pill', dueDate === ymd(tomorrow) && 'on')}
              >
                Morgen
              </button>
              <button
                type="button"
                onClick={() => setDueDate(ymd(nextWeek))}
                className={clsx('pill', dueDate === ymd(nextWeek) && 'on')}
              >
                +1w
              </button>
              <input
                type="date"
                value={dueDate ?? ''}
                onChange={(e) => setDueDate(e.target.value || null)}
                className="qa-date"
              />
              {dueDate && (
                <span className="muted-text font-mono-tight">
                  {format(new Date(dueDate), 'd MMM', { locale: nl })}
                </span>
              )}
            </div>
          </div>

          {scope === 'work' && (
            <div className="qa-group">
              <span className="qa-label font-mono-tight">project</span>
              <div className="select-wrap qa-proj-select">
                <select
                  value={projectId ?? ''}
                  onChange={(e) => setProjectId(e.target.value || null)}
                >
                  <option value="">📥 Inbox (geen project)</option>
                  {projects
                    .filter((p) => p.status === 'active')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
                <ChevronDown size={11} className="select-chev" />
              </div>
            </div>
          )}
        </div>
        <div className="qa-foot">
          <button
            type="button"
            onClick={closeQuickAdd}
            className="btn btn-ghost"
          >
            Annuleer
          </button>
          <button
            type="submit"
            disabled={!title.trim() || create.isPending}
            className="btn btn-primary"
          >
            {create.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            Toevoegen
          </button>
        </div>
      </form>
    </div>
  );
}
