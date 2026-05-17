/**
 * ThemeToggle: dark/light mode switch. Applies .dark class to <html>.
 * Persists in localStorage. No prefers-color-scheme — fully manual.
 */
'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('sonar-theme') as Theme | null;
  if (stored) return stored;
  return 'light';
}

function applyTheme(t: Theme) {
  const el = document.documentElement;
  if (t === 'dark') {
    el.classList.add('dark');
  } else {
    el.classList.remove('dark');
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('sonar-theme', next);
    applyTheme(next);
  };

  if (!theme) return <div className="w-8 h-8" />; // placeholder during SSR

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="w-10 h-10 neo-card flex items-center justify-center hover:bg-accent/10 shadow-brutal-sm"
    >
      {theme === 'dark' ? (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M13.2 9.2A5 5 0 016.8 2.8 5.5 5.5 0 1013.2 9.2z" />
        </svg>
      )}
    </button>
  );
}
