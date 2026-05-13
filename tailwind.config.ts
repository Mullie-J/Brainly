import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        surface3: 'rgb(var(--surface-3) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        'text-strong': 'rgb(var(--text-strong) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        muted2: 'rgb(var(--muted-2) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        emerald: 'rgb(var(--emerald) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        rose: 'rgb(var(--rose) / <alpha-value>)',
        sky: 'rgb(var(--sky) / <alpha-value>)',
        zinc: 'rgb(var(--zinc) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontSize: {
        // Override base to 14px to match prototype
        sm: ['13px', { lineHeight: '1.45' }],
        base: ['14px', { lineHeight: '1.45' }],
      },
      letterSpacing: {
        tight: '-0.025em',
        tightish: '-0.01em',
      },
    },
  },
  plugins: [],
} satisfies Config;
