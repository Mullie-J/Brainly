import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  useProjects,
  useCreateProject,
} from '@/hooks/useProjects';
import { useTodos } from '@/hooks/useTodos';
import type { ProjectStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'actief',
  on_hold: 'on hold',
  done: 'klaar',
  archived: 'archief',
};

const STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  active: 'dot-emerald',
  on_hold: 'dot-amber',
  done: 'dot-sky',
  archived: 'dot-zinc',
};

function projectAccent(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `oklch(70% 0.12 ${hue})`;
}

export default function ProjectsList() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: allTodos = [] } = useTodos();
  const createProject = useCreateProject();
  const navigate = useNavigate();

  async function handleNew() {
    const p = await createProject.mutateAsync({ title: 'Nieuw project' });
    navigate(`/p/${p.id}`);
  }

  const activeCount = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div className="page-header-meta">
          <div className="page-eyebrow">
            <FolderKanban size={11} /> Projecten
          </div>
          <h1 className="page-title">Alle projecten</h1>
          <p className="page-sub">
            <span className="tabular">{projects.length}</span>{' '}
            {projects.length === 1 ? 'project' : 'projecten'}
            {activeCount > 0 && (
              <>
                {' '}· <span className="tabular">{activeCount}</span> actief
              </>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={handleNew}
            disabled={createProject.isPending}
            className="btn btn-primary"
          >
            {createProject.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Nieuw project
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="muted-text">Laden...</p>
      ) : projects.length === 0 ? (
        <div className="empty-card">
          <p style={{ marginBottom: 12 }}>Nog geen projecten.</p>
          <button onClick={handleNew} className="btn btn-primary">
            <Plus size={14} /> Maak je eerste project
          </button>
        </div>
      ) : (
        <div className="proj-grid">
          {projects.map((p) => {
            const open = allTodos.filter(
              (t) => t.project_id === p.id && t.status !== 'done'
            ).length;
            const done = allTodos.filter(
              (t) => t.project_id === p.id && t.status === 'done'
            ).length;
            const total = open + done;
            const accent = projectAccent(p.id);
            return (
              <Link key={p.id} to={`/p/${p.id}`} className="proj-card">
                <div className="proj-card-bar" style={{ background: accent }} />
                <div className="proj-card-body">
                  <div className="proj-card-head">
                    <span className={`dot ${STATUS_DOT_CLASS[p.status]}`} />
                    <span className="muted-text font-mono-tight">
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <h3 className="proj-card-title">{p.title || 'Untitled'}</h3>
                  {p.north_star && (
                    <p className="proj-card-ns">{p.north_star}</p>
                  )}
                  <div className="proj-card-meta">
                    <span>
                      <span className="tabular">{open}</span> open
                    </span>
                    {total > 0 && (
                      <>
                        <span className="muted-text">·</span>
                        <span>
                          <span className="tabular">{done}</span>/{total} klaar
                        </span>
                      </>
                    )}
                    {p.deadline && (
                      <>
                        <span className="muted-text">·</span>
                        <span>
                          {format(parseISO(p.deadline), 'd MMM yyyy', { locale: nl })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
