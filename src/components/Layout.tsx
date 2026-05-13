import { Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { clsx } from 'clsx';
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

  // Global shortcuts
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
    <div className="h-screen flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar (drawer) */}
      <div
        className={clsx(
          'md:hidden fixed inset-0 z-40 transition-opacity',
          sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          onClick={() => setSidebarOpen(false)}
          className={clsx(
            'absolute inset-0 bg-black transition-opacity',
            sidebarOpen ? 'opacity-30' : 'opacity-0'
          )}
        />
        <div
          className={clsx(
            'absolute left-0 top-0 bottom-0 transition-transform',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-surface2"
            aria-label="Menu"
          >
            <Menu size={18} />
          </button>
          <span className="font-semibold tracking-tight">Brainly</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
      <QuickAddTodo />
      <TodoDetail />
      <Toaster />
    </div>
  );
}
