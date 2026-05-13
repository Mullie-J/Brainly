import { useRef } from 'react';
import { CalendarDays, Target, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Project, ProjectStatus } from '@/lib/types';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import InlineEdit from '@/components/InlineEdit';

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: 'active', label: 'Actief', dot: 'bg-emerald-500' },
  { value: 'on_hold', label: 'On hold', dot: 'bg-amber-500' },
  { value: 'done', label: 'Klaar', dot: 'bg-blue-500' },
  { value: 'archived', label: 'Archief', dot: 'bg-zinc-400' },
];

export default function ProjectHeader({ project }: { project: Project }) {
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const navigate = useNavigate();
  const deadlineRef = useRef<HTMLInputElement>(null);
  const statusOpt =
    STATUS_OPTIONS.find((s) => s.value === project.status) ?? STATUS_OPTIONS[0];

  async function handleDelete() {
    if (!confirm(`Project "${project.title}" verwijderen?`)) return;
    await remove.mutateAsync(project.id);
    navigate('/projects');
  }

  function openDeadlinePicker(e: React.MouseEvent) {
    e.preventDefault();
    const input = deadlineRef.current;
    if (!input) return;
    if (typeof (input as any).showPicker === 'function') {
      try {
        (input as any).showPicker();
        return;
      } catch {
        // fall through
      }
    }
    input.focus();
    input.click();
  }

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-2xl md:text-3xl font-semibold tracking-tight">
          <InlineEdit
            value={project.title}
            onSave={(title) => update.mutate({ id: project.id, patch: { title } })}
            placeholder="Untitled"
          />
        </h1>
        <button
          onClick={handleDelete}
          className="p-2 rounded-md text-muted hover:text-red-500 hover:bg-surface2"
          aria-label="Project verwijderen"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="relative">
          <select
            value={project.status}
            onChange={(e) =>
              update.mutate({
                id: project.id,
                patch: { status: e.target.value as ProjectStatus },
              })
            }
            className="appearance-none pl-6 pr-3 py-1 bg-surface2 border border-border rounded-full text-text cursor-pointer hover:border-accent/50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <span
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${statusOpt.dot}`}
          />
        </div>

        <span
          onClick={openDeadlinePicker}
          className="group/dl relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface2 border border-border rounded-full hover:border-accent/50 cursor-pointer"
        >
          <CalendarDays size={12} className="text-muted" />
          {project.deadline ? (
            <span>{format(parseISO(project.deadline), 'd MMM yyyy')}</span>
          ) : (
            <span className="text-muted">Geen deadline</span>
          )}
          {project.deadline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                update.mutate({
                  id: project.id,
                  patch: { deadline: null },
                });
              }}
              className="opacity-0 group-hover/dl:opacity-100 hover:text-red-500 relative z-10"
              aria-label="Verwijder deadline"
            >
              <X size={11} />
            </button>
          )}
          <input
            ref={deadlineRef}
            type="date"
            value={project.deadline ?? ''}
            onChange={(e) =>
              update.mutate({
                id: project.id,
                patch: { deadline: e.target.value || null },
              })
            }
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            aria-hidden="true"
            tabIndex={-1}
          />
        </span>
      </div>

      {/* North star */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
        <Target size={15} className="text-accent shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <div className="text-[11px] uppercase tracking-wider text-accent font-medium mb-0.5">
            North star
          </div>
          <InlineEdit
            value={project.north_star ?? ''}
            onSave={(north_star) =>
              update.mutate({ id: project.id, patch: { north_star: north_star || null } })
            }
            placeholder="Wat is succes voor dit project?"
          />
        </div>
      </div>
    </div>
  );
}
