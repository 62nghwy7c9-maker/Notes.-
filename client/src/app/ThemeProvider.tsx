import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Theme } from './theme.js';
import { applyTheme, loadTheme, storeTheme } from './theme.js';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme, document.documentElement);
    storeTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme: setThemeState }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme muss innerhalb von ThemeProvider genutzt werden.');
  return ctx;
}
