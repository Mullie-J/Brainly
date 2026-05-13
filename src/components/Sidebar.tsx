import { NavLink, useNavigate } from 'react-router-dom';
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
        clsx(
          'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-surface2 text-text'
            : 'text-muted hover:bg-surface2 hover:text-text'
        )
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs text-muted tabular-nums">{badge}</span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { data: projects = [] } = useProjects();
  const { data: openNotes = [] } = useNotes({ done: false });
  const { data: allTodos = [] } = useTodos();
  const { data: reviewQueue = [] } = useReviewQueue();
  const { setSidebarOpen, setPaletteOpen, openQuickAdd, theme, setTheme } = useUI();
  const { signOut, user } = useAuth();
  const createProject = useCreateProject();
  const createNote = useCreateNote();
  const navigate = useNavigate();
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
    <aside className="h-full w-[260px] bg-surface border-r border-border flex flex-col">
      {/* Top: brand + close (mobile) */}
      <div className="px-3 py-3 flex items-center gap-2 border-b border-border">
        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
          <Brain size={15} className="text-accent" />
        </div>
        <span className="font-semibold tracking-tight">Brainly</span>
        <button
          onClick={closeOnMobile}
          className="ml-auto md:hidden p-1.5 rounded-md hover:bg-surface2"
          aria-label="Sluit sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search trigger */}
      <button
        onClick={() => {
          setPaletteOpen(true);
          closeOnMobile();
        }}
        className="mx-3 mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted bg-surface2/60 hover:bg-surface2 transition-colors"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Snel zoeken</span>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-border">
          ⌘K
        </kbd>
      </button>

      {/* Quick-add row: to-do + note side by side */}
      <div className="mx-3 mt-1.5 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => {
            openQuickAdd(null);
            closeOnMobile();
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-accent bg-accent/10 hover:bg-accent/15 transition-colors font-medium min-w-0"
          title="Snelle to-do (T)"
        >
          <Plus size={12} className="shrink-0" />
          <span className="flex-1 text-left truncate">To-do</span>
          <kbd className="text-[9px] font-mono px-1 py-0 rounded bg-bg border border-border text-muted shrink-0">
            T
          </kbd>
        </button>
        <button
          onClick={handleQuickNote}
          disabled={createNote.isPending}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-accent bg-accent/10 hover:bg-accent/15 transition-colors font-medium disabled:opacity-50 min-w-0"
          title="Snelle notitie (N)"
        >
          {createNote.isPending ? (
            <Loader2 size={12} className="animate-spin shrink-0" />
          ) : (
            <Plus size={12} className="shrink-0" />
          )}
          <span className="flex-1 text-left truncate">Notitie</span>
          <kbd className="text-[9px] font-mono px-1 py-0 rounded bg-bg border border-border text-muted shrink-0">
            N
          </kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="px-2 pt-3 space-y-0.5">
        <NavItem to="/" icon={Star} label="Vandaag" badge={todayCount} onClick={closeOnMobile} />
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

      {/* Projects list */}
      <div className="mt-5 px-2 flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between px-1.5 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Projecten
          </span>
          <button
            onClick={handleCreateProject}
            disabled={creating}
            className="p-1 rounded hover:bg-surface2 text-muted hover:text-text disabled:opacity-50"
            aria-label="Nieuw project"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          </button>
        </div>
        <div className="space-y-0.5">
          {projects.map((p) => (
            <NavLink
              key={p.id}
              to={`/p/${p.id}`}
              onClick={closeOnMobile}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm truncate transition-colors',
                  isActive
                    ? 'bg-surface2 text-text'
                    : 'text-muted hover:bg-surface2 hover:text-text'
                )
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0" />
              <span className="truncate">{p.title || 'Untitled'}</span>
            </NavLink>
          ))}
          {projects.length === 0 && (
            <p className="text-xs text-muted px-2 py-1">Nog geen projecten.</p>
          )}
        </div>

        {/* Open notes — alles wat nog niet als klaar gemarkeerd is */}
        {openNotes.length > 0 && (
          <>
            <div className="mt-5 flex items-center justify-between px-1.5 mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Open notities
              </span>
              {openNotes.length > 10 && (
                <NavLink
                  to="/notes"
                  onClick={closeOnMobile}
                  className="text-[10px] text-muted hover:text-text"
                >
                  alle →
                </NavLink>
              )}
            </div>
            <div className="space-y-0.5">
              {openNotes.slice(0, 10).map((n) => (
                <NavLink
                  key={n.id}
                  to={n.project_id ? `/p/${n.project_id}/n/${n.id}` : `/n/${n.id}`}
                  onClick={closeOnMobile}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm truncate transition-colors',
                      isActive
                        ? 'bg-surface2 text-text'
                        : 'text-muted hover:bg-surface2 hover:text-text'
                    )
                  }
                >
                  <StickyNote size={13} className="shrink-0 opacity-60" />
                  <span className="truncate">{n.title || 'Untitled'}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom: theme toggle + user */}
      <div className="p-2 border-t border-border space-y-1">
        {/* Theme switcher */}
        <div className="flex items-center gap-1 px-1.5 py-1 bg-surface2/50 rounded-md">
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
              className={clsx(
                'flex-1 py-1 rounded flex items-center justify-center transition-colors',
                theme === id
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              )}
            >
              <Icon size={12} />
            </button>
          ))}
        </div>

        {/* User row */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-semibold text-accent">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="flex-1 truncate">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="p-1 rounded hover:bg-surface2 hover:text-text"
            aria-label="Uitloggen"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
