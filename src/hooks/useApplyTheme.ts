import { useEffect } from 'react';
import { useUI } from '@/store/ui';

// Applies "dark" class on <html> based on theme setting, and follows
// system preference live when theme = 'system'.
export function useApplyTheme() {
  const theme = useUI((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function apply() {
      const wantsDark =
        theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', wantsDark);
    }

    apply();
    if (theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [theme]);
}
