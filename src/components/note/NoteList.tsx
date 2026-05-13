import { Link, useNavigate } from 'react-router-dom';
import { Plus, StickyNote, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNotes, useCreateNote } from '@/hooks/useNotes';

export default function NoteList({ projectId }: { projectId?: string | null }) {
  const { data: notes = [], isLoading } = useNotes({ projectId });
  const create = useCreateNote();
  const navigate = useNavigate();

  async function handleNew() {
    const n = await create.mutateAsync({ project_id: projectId ?? null });
    if (projectId) navigate(`/p/${projectId}/n/${n.id}`);
    else navigate(`/n/${n.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-muted font-medium">
          {notes.length} {notes.length === 1 ? 'notitie' : 'notities'}
        </h2>
        <button
          onClick={handleNew}
          disabled={create.isPending}
          className="text-xs text-muted hover:text-text inline-flex items-center gap-1"
        >
          {create.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Plus size={12} />
          )}
          Nieuwe notitie
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Laden...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted py-4">Nog geen notities.</p>
      ) : (
        <div className="space-y-1.5">
          {notes.map((n) => (
            <Link
              key={n.id}
              to={projectId ? `/p/${projectId}/n/${n.id}` : `/n/${n.id}`}
              className="flex items-center gap-3 px-3 py-2.5 bg-surface border border-border rounded-md hover:border-accent/40 transition-colors"
            >
              <StickyNote size={14} className="text-muted shrink-0" />
              <span className="flex-1 truncate text-sm">{n.title || 'Untitled'}</span>
              <span className="text-xs text-muted shrink-0 tabular-nums">
                {format(parseISO(n.updated_at), 'dd/MM/yy')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
