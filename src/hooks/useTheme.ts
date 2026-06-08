import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('alarme_theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('alarme_theme', next); } catch {}
      return next;
    });
  }, []);

  return { theme, toggle };
}
