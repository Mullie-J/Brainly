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
    return (
      <div className="page page-wide">
        <p className="muted-text">Project laden...</p>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <ProjectHeader project={project} />

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx('tab', tab === t.id && 'on')}
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
