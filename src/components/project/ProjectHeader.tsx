import { useRef } from 'react';
import { CalendarDays, Target, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTodos } from '@/hooks/useTodos';
import type { Project, ProjectStatus } from '@/lib/types';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import InlineEdit from '@/components/InlineEdit';

const STATUS_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: 'active', label: 'actief', dot: 'dot-emerald' },
  { value: 'on_hold', label: 'on hold', dot: 'dot-amber' },
  { value: 'done', label: 'klaar', dot: 'dot-sky' },
  { value: 'archived', label: 'archief', dot: 'dot-zinc' },
];

function projectAccent(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `oklch(70% 0.12 ${hue})`;
}

export default function ProjectHeader({ project }: { project: Project }) {
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const navigate = useNavigate();
  const deadlineRef = useRef<HTMLInputElement>(null);
  const { data: allTodos = [] } = useTodos({ projectId: project.id });
  const open = allTodos.filter((t) => t.status !== 'done').length;
  const done = allTodos.filter((t) => t.status === 'done').length;
  const total = open + done;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

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
      } catch {}
    }
    input.focus();
    input.click();
  }

  return (
    <header className="project-head">
      <div className="ph-top">
        <div className="ph-title-row">
          <span
            className="ph-swatch"
            style={{ background: projectAccent(project.id) }}
          />
          <h1 className="page-title" style={{ margin: 0, flex: 1, minWidth: 0 }}>
            <InlineEdit
              value={project.title}
              onSave={(title) => update.mutate({ id: project.id, patch: { title } })}
              placeholder="Untitled"
            />
          </h1>
        </div>
        <button
          onClick={handleDelete}
          className="btn btn-ghost"
          aria-label="Project verwijderen"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="ph-meta">
        <div className="select-wrap">
          <select
            value={project.status}
            onChange={(e) =>
              update.mutate({
                id: project.id,
                patch: { status: e.target.value as ProjectStatus },
              })
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <span className="ph-chip">
          <span className={`dot ${statusOpt.dot}`} />
          {statusOpt.label}
        </span>

        <span
          onClick={openDeadlinePicker}
          className="ph-chip"
          style={{ cursor: 'pointer' }}
        >
          <CalendarDays size={12} />
          {project.deadline ? (
            <>
              {format(parseISO(project.deadline), 'd MMM yyyy', { locale: nl })}
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
                aria-label="Verwijder deadline"
                style={{
                  color: 'rgb(var(--muted))',
                  marginLeft: 4,
                }}
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <span className="muted-text">Geen deadline</span>
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
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 0,
              height: 0,
            }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </span>

        {total > 0 && (
          <div className="ph-progress">
            <span className="muted-text font-mono-tight tabular">
              {done}/{total}
            </span>
            <div className="ph-bar">
              <span
                className="ph-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="north-star">
        <Target size={15} className="ns-icon" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ns-label">// north star</div>
          <div className="ns-text">
            <InlineEdit
              value={project.north_star ?? ''}
              onSave={(north_star) =>
                update.mutate({
                  id: project.id,
                  patch: { north_star: north_star || null },
                })
              }
              placeholder="Wat is succes voor dit project?"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
