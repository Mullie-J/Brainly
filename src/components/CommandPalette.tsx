import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FolderKanban,
  StickyNote,
  CheckSquare,
  Plus,
  Star,
  ListTodo,
  Calendar,
  Repeat,
} from 'lucide-react';
import { useUI } from '@/store/ui';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useNotes, useCreateNote } from '@/hooks/useNotes';
import { useTodos } from '@/hooks/useTodos';

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  action: () => void;
  searchText?: string; // optional extra text to match against (TLDR, body)
};

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openQuickAdd } = useUI();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: notes = [] } = useNotes();
  const { data: todos = [] } = useTodos();
  const createProject = useCreateProject();
  const createNote = useCreateNote();

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setActive(0);
    }
  }, [paletteOpen]);

  const items = useMemo<Item[]>(() => {
    const close = () => setPaletteOpen(false);
    const go = (path: string) => {
      navigate(path);
      close();
    };

    const actions: Item[] = [
      {
        id: 'a:vandaag',
        label: 'Ga naar Vandaag',
        icon: Star,
        action: () => go('/'),
      },
      {
        id: 'a:agenda',
        label: 'Ga naar Agenda',
        icon: Calendar,
        action: () => go('/agenda'),
      },
      {
        id: 'a:week-plan',
        label: 'Plan deze week',
        icon: Calendar,
        action: () => go('/agenda'),
      },
      {
        id: 'a:todos',
        label: "Ga naar Alle to-do's",
        icon: ListTodo,
        action: () => go('/todos'),
      },
      {
        id: 'a:notes',
        label: 'Ga naar Alle notities',
        icon: StickyNote,
        action: () => go('/notes'),
      },
      {
        id: 'a:projects',
        label: 'Ga naar Alle projecten',
        icon: FolderKanban,
        action: () => go('/projects'),
      },
      {
        id: 'a:review',
        label: 'Start review-sessie',
        icon: Repeat,
        action: () => go('/review'),
      },
      {
        id: 'a:new-todo',
        label: 'Nieuwe to-do',
        hint: 'T',
        icon: Plus,
        action: () => {
          close();
          openQuickAdd();
        },
      },
      {
        id: 'a:new-note-shortcut',
        label: 'Nieuwe notitie',
        hint: 'N',
        icon: Plus,
        action: async () => {
          const n = await createNote.mutateAsync({});
          go(`/n/${n.id}`);
        },
      },
      {
        id: 'a:new-project',
        label: 'Nieuw project',
        icon: Plus,
        action: async () => {
          const p = await createProject.mutateAsync({ title: 'Nieuw project' });
          go(`/p/${p.id}`);
        },
      },
      {
        id: 'a:new-note',
        label: 'Nieuwe losse notitie',
        icon: Plus,
        action: async () => {
          const n = await createNote.mutateAsync({});
          go(`/n/${n.id}`);
        },
      },
    ];

    const projItems: Item[] = projects.map((p) => ({
      id: `p:${p.id}`,
      label: p.title || 'Untitled',
      hint: 'Project',
      icon: FolderKanban,
      action: () => go(`/p/${p.id}`),
    }));

    const noteItems: Item[] = notes.map((n) => ({
      id: `n:${n.id}`,
      label: n.title || 'Untitled',
      hint: n.tldr ? n.tldr.slice(0, 60) : 'Notitie',
      icon: StickyNote,
      searchText: `${n.tldr ?? ''} ${n.body_text ?? ''}`,
      action: () => {
        if (n.project_id) go(`/p/${n.project_id}/n/${n.id}`);
        else go(`/n/${n.id}`);
      },
    }));

    const todoItems: Item[] = todos.slice(0, 30).map((t) => ({
      id: `t:${t.id}`,
      label: t.title,
      hint: t.project_id
        ? projects.find((p) => p.id === t.project_id)?.title ?? 'Project'
        : 'Inbox',
      icon: CheckSquare,
      action: () => {
        if (t.project_id) go(`/p/${t.project_id}`);
        else go('/todos');
      },
    }));

    const all = [...actions, ...projItems, ...noteItems, ...todoItems];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 30);
    return all
      .filter((i) => {
        const hay = `${i.label} ${i.searchText ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [
    query,
    projects,
    notes,
    todos,
    navigate,
    setPaletteOpen,
    openQuickAdd,
    createProject,
    createNote,
  ]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!paletteOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(items.length - 1, a + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        items[active]?.action();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, items, active, setPaletteOpen]);

  if (!paletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/30"
      onClick={() => setPaletteOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface rounded-xl border border-border shadow-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Zoek of voer commando uit..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="text-[10px] text-muted font-mono">ESC</kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto py-1">
          {items.length === 0 && (
            <p className="text-sm text-muted px-4 py-3">Geen resultaten.</p>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onMouseEnter={() => setActive(i)}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  i === active ? 'bg-surface2' : 'hover:bg-surface2'
                }`}
              >
                <Icon size={14} className="text-muted shrink-0" />
                <span className="flex-1 truncate text-left">{item.label}</span>
                {item.hint && (
                  <span className="text-xs text-muted">{item.hint}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
