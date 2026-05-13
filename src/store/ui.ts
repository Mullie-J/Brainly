import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'brainly:theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const t = window.localStorage.getItem(THEME_KEY);
  if (t === 'light' || t === 'dark' || t === 'system') return t;
  return 'system';
}

interface UIState {
  sidebarOpen: boolean;          // mobile drawer
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  quickAddOpen: boolean;
  quickAddProjectId: string | null;
  openQuickAdd: (projectId?: string | null) => void;
  closeQuickAdd: () => void;

  // Todo detail modal
  openTodoId: string | null;
  openTodo: (id: string) => void;
  closeTodo: () => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),

  quickAddOpen: false,
  quickAddProjectId: null,
  openQuickAdd: (projectId) =>
    set({ quickAddOpen: true, quickAddProjectId: projectId ?? null }),
  closeQuickAdd: () => set({ quickAddOpen: false }),

  openTodoId: null,
  openTodo: (id) => set({ openTodoId: id }),
  closeTodo: () => set({ openTodoId: null }),

  theme: getStoredTheme(),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, theme);
    }
    set({ theme });
  },
}));
