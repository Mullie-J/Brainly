import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastsState {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
}

export const useToasts = create<ToastsState>((set, get) => ({
  toasts: [],
  showToast: (t) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, durationMs: 5000, ...t };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (toast.durationMs && toast.durationMs > 0) {
      setTimeout(() => get().dismissToast(id), toast.durationMs);
    }
    return id;
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
