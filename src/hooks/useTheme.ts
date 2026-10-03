import { useCallback, useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light';

const STORAGE_KEY = 'proofboard.theme';

function readInitialTheme(): ThemeName {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * Persisted dark / "paper blueprint" theme switch.
 *
 * A pre-paint script in index.html applies the stored value before React
 * mounts, so there is no flash of the wrong palette; this hook keeps the
 * attribute and localStorage in sync afterwards.
 */
export function useTheme(): [ThemeName, () => void] {
  const [theme, setTheme] = useState<ThemeName>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode — the theme just will not persist */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggle];
}
