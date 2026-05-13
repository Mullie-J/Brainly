import { Link, useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import type { ProjectStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Actief',
  on_hold: 'On hold',
  done: 'Klaar',
  archived: 'Archief',
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  active: 'bg-emerald-500',
  on_hold: 'bg-amber-500',
  done: 'bg-blue-500',
  archived: 'bg-zinc-400',
};

export default function ProjectsList() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const navigate = useNavigate();

  async function handleNew() {
    const p = await createProject.mutateAsync({ title: 'Nieuw project' });
    navigate(`/p/${p.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Projecten</h1>
          <p className="text-sm text-muted mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projecten'}
          </p>
        </div>
        <button
          onClick={handleNew}
          disabled={createProject.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {createProject.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Nieuw project
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted">Laden...</div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted mb-3">Nog geen projecten.</p>
          <button
            onClick={handleNew}
            className="text-sm text-accent hover:underline inline-flex items-center gap-1"
          >
            <Plus size={14} /> Maak je eerste project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/p/${p.id}`}
              className="block bg-surface border border-border rounded-lg p-4 hover:border-accent/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-2 h-2 rounded-full ${STATUS_DOT[p.status]}`}
                  title={STATUS_LABEL[p.status]}
                />
                <span className="text-[11px] text-muted uppercase tracking-wider">
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <h3 className="font-medium tracking-tight mb-1 truncate">
                {p.title || 'Untitled'}
              </h3>
              {p.north_star && (
                <p className="text-xs text-muted line-clamp-2 mb-3">{p.north_star}</p>
              )}
              {p.deadline && (
                <div className="flex items-center gap-1 text-xs text-muted">
                  <CalendarDays size={12} />
                  {format(parseISO(p.deadline), 'd MMM yyyy')}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
