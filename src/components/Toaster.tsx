import { useToasts } from '@/store/toasts';
import { X } from 'lucide-react';

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 bg-text text-surface rounded-lg shadow-lg px-4 py-2.5 text-sm min-w-[280px] max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="font-medium text-accent hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100"
            aria-label="Sluit"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
