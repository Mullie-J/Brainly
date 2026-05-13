import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Brain, Search, Plus } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUI } from '@/store/ui';
import { useEffect } from 'react';
import CommandPalette from './CommandPalette';
import QuickAddTodo from './todo/QuickAddTodo';
import TodoDetail from './todo/TodoDetail';
import Toaster from './Toaster';
import { useCreateNote } from '@/hooks/useNotes';

export default function Layout() {
  const { sidebarOpen, setSidebarOpen, setPaletteOpen, openQuickAdd } = useUI();
  const createNote = useCreateNote();
  const navigate = useNavigate();

  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const inEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (!inEditable && !meta && e.key.toLowerCase() === 't') {
        e.preventDefault();
        openQuickAdd();
      } else if (!inEditable && !meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const note = await createNote.mutateAsync({});
        navigate(`/n/${note.id}`);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, openQuickAdd, createNote, navigate]);

  return (
    <div className="app" data-sb-open={sidebarOpen ? 'true' : 'false'}>
      <div className="app-sidebar-wrap">
        <Sidebar />
      </div>
      {sidebarOpen && (
        <div className="sb-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <main className="main">
        <div className="topbar">
          <button
            className="topbar-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menu"
          >
            <Menu size={18} />
          </button>
          <div className="topbar-brand">
            <Brain size={14} /> Brainly
          </div>
          <button
            className="topbar-search"
            onClick={() => setPaletteOpen(true)}
            aria-label="Zoek"
          >
            <Search size={16} />
          </button>
        </div>
        <div className="main-scroll">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
      <QuickAddTodo />
      <TodoDetail />
      <Toaster />

      {/* Mobile FAB — primary action always within thumb reach */}
      <button
        type="button"
        onClick={() => openQuickAdd()}
        className="fab"
        aria-label="Snelle to-do"
        title="Snelle to-do (T)"
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>
    </div>
  );
}
