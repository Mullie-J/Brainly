import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useProject } from '@/hooks/useProjects';
import ProjectHeader from '@/components/project/ProjectHeader';
import ProjectInfoTab from '@/components/project/ProjectInfoTab';
import TodoBoard from '@/components/todo/TodoBoard';
import NoteList from '@/components/note/NoteList';

type Tab = 'todos' | 'notes' | 'info';

const TABS: { id: Tab; label: string }[] = [
  { id: 'todos', label: "To-do's" },
  { id: 'notes', label: 'Notities' },
  { id: 'info', label: 'Info' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { data: project, isLoading } = useProject(projectId);
  const [tab, setTab] = useState<Tab>('todos');

  if (isLoading || !project) {
    return <div className="p-10 text-sm text-muted">Project laden...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-6 md:py-10">
      <ProjectHeader project={project} />

      {/* Tabs */}
      <div className="mt-8 mb-5 border-b border-border flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-3 py-2 -mb-px text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-accent text-text'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'todos' && <TodoBoard projectId={project.id} />}
      {tab === 'notes' && <NoteList projectId={project.id} />}
      {tab === 'info' && <ProjectInfoTab project={project} />}
    </div>
  );
}
