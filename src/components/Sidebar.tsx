import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Brain,
  ListTodo,
  Star,
  Plus,
  FolderKanban,
  StickyNote,
  Search,
  LogOut,
  X,
  Loader2,
  Calendar,
  Repeat,
  Sun,
  Moon,
  Monitor,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { useReviewQueue } from '@/hooks/useNotes';
import { clsx } from 'clsx';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useNotes, useCreateNote } from '@/hooks/useNotes';
import { useTodos } from '@/hooks/useTodos';
import { useUI } from '@/store/ui';
import { useAuth } from '@/hooks/useAuth';
import { isToday, parseISO, isPast } from 'date-fns';
import { useState } from 'react';

function projectAccent(id: string): string {
  // Map project id → consistent hue around the color wheel. Stable per id.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `oklch(70% 0.12 ${hue})`;
}

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  to: string;
  icon: typeof ListTodo;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx('sb-item', isActive && 'on')
      }
    >
      <Icon size={15} />
      <span className="sb-item-label">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="sb-item-badge tabular">{badge}</span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { data: projects = [] } = useProjects();
  const { data: openNotes = [] } = useNotes({ done: false });
  const { data: allTodos = [] } = useTodos();
  const { data: reviewQueue = [] } = useReviewQueue();
  const { setSidebarOpen, setPaletteOpen, openQuickAdd, theme, setTheme } =
    useUI();
  const { signOut, user } = useAuth();
  const createProject = useCreateProject();
  const createNote = useCreateNote();
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  const openTodosCount = allTodos.filter((t) => t.status !== 'done').length;
  const todayCount = allTodos.filter(
    (t) =>
      t.status !== 'done' &&
      t.due_date &&
      (isToday(parseISO(t.due_date)) || isPast(parseISO(t.due_date)))
  ).length;

  const closeOnMobile = () => setSidebarOpen(false);

  async function handleQuickNote() {
    closeOnMobile();
    const note = await createNote.mutateAsync({});
    navigate(`/n/${note.id}`);
  }

  async function handleCreateProject() {
    setCreating(true);
    try {
      const project = await createProject.mutateAsync({ title: 'Nieuw project' });
      navigate(`/p/${project.id}`);
      closeOnMobile();
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-brand-mark">
          <Brain size={15} />
        </div>
        <span className="sb-brand-name">Brainly</span>
        <button
          className="sb-close"
          onClick={closeOnMobile}
          aria-label="Sluit sidebar"
        >
          <X size={15} />
        </button>
      </div>

      <button
        className="sb-search"
        onClick={() => {
          setPaletteOpen(true);
          closeOnMobile();
        }}
      >
        <Search size={13} />
        <span>Snel zoeken</span>
        <kbd className="kbd">⌘K</kbd>
      </button>

      <div className="sb-quick">
        <button
          className="sb-quick-btn"
          onClick={() => {
            openQuickAdd(null);
            closeOnMobile();
          }}
          title="Snelle to-do (T)"
        >
          <Plus size={12} />
          <span>To-do</span>
          <kbd className="kbd">T</kbd>
        </button>
        <button
          className="sb-quick-btn"
          onClick={handleQuickNote}
          disabled={createNote.isPending}
          title="Snelle notitie (N)"
        >
          {createNote.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Plus size={12} />
          )}
          <span>Notitie</span>
          <kbd className="kbd">N</kbd>
        </button>
      </div>

      <nav className="sb-nav">
        <NavItem
          to="/"
          icon={Star}
          label="Vandaag"
          badge={todayCount}
          onClick={closeOnMobile}
        />
        <NavItem to="/agenda" icon={Calendar} label="Agenda" onClick={closeOnMobile} />
        <NavItem
          to="/todos"
          icon={ListTodo}
          label="Alle to-do's"
          badge={openTodosCount}
          onClick={closeOnMobile}
        />
        <NavItem
          to="/notes"
          icon={StickyNote}
          label="Alle notities"
          onClick={closeOnMobile}
        />
        <NavItem
          to="/projects"
          icon={FolderKanban}
          label="Alle projecten"
          onClick={closeOnMobile}
        />
        <NavItem
          to="/review"
          icon={Repeat}
          label="Review"
          badge={reviewQueue.length}
          onClick={closeOnMobile}
        />
        <NavItem
          to="/habits"
          icon={Activity}
          label="Gewoontes"
          onClick={closeOnMobile}
        />
        <NavItem
          to="/weekly-review"
          icon={ClipboardList}
          label="Weekly review"
          onClick={closeOnMobile}
        />
      </nav>

      <div className="sb-section">
        <div className="sb-section-head">
          <span>Projecten</span>
          <button
            className="sb-section-add"
            onClick={handleCreateProject}
            disabled={creating}
            aria-label="Nieuw project"
          >
            {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          </button>
        </div>
        <div className="sb-list">
          {projects.map((p) => {
            const active = location.pathname === `/p/${p.id}`;
            return (
              <NavLink
                key={p.id}
                to={`/p/${p.id}`}
                onClick={closeOnMobile}
                className={clsx('sb-proj', active && 'on')}
              >
                <span
                  className="sb-proj-dot"
                  style={{ background: projectAccent(p.id) }}
                />
                <span className="sb-proj-name">{p.title || 'Untitled'}</span>
              </NavLink>
            );
          })}
          {projects.length === 0 && (
            <p className="muted-text" style={{ fontSize: 12, padding: '4px 10px' }}>
              Nog geen projecten.
            </p>
          )}

          {openNotes.length > 0 && (
            <>
              <div className="sb-section-head" style={{ marginTop: 16 }}>
                <span>Open notities</span>
                {openNotes.length > 10 && (
                  <NavLink
                    to="/notes"
                    onClick={closeOnMobile}
                    className="muted-text"
                    style={{ fontSize: 10 }}
                  >
                    alle →
                  </NavLink>
                )}
              </div>
              {openNotes.slice(0, 10).map((n) => (
                <NavLink
                  key={n.id}
                  to={n.project_id ? `/p/${n.project_id}/n/${n.id}` : `/n/${n.id}`}
                  onClick={closeOnMobile}
                  className={({ isActive }) =>
                    clsx('sb-proj', isActive && 'on')
                  }
                >
                  <StickyNote size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <span className="sb-proj-name">{n.title || 'Untitled'}</span>
                </NavLink>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="sb-footer">
        <div className="sb-theme">
          {([
            { id: 'light', icon: Sun, label: 'Licht' },
            { id: 'system', icon: Monitor, label: 'Systeem' },
            { id: 'dark', icon: Moon, label: 'Donker' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              title={label}
              aria-label={label}
              className={clsx('sb-theme-btn', theme === id && 'on')}
            >
              <Icon size={12} />
            </button>
          ))}
        </div>
        <div className="sb-user">
          <div className="sb-avatar">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="sb-user-mail">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="sb-logout"
            aria-label="Uitloggen"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
