export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEMES: Theme[] = ['light', 'dark', 'system'];
const STORAGE_KEY = 'notes.theme';

/** Ermittelt das effektive Farbschema aus Wahl + System-Präferenz. */
export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

/**
 * Schreibt die Theme-Wahl auf `<html data-theme>`: bei „system" wird das
 * Attribut entfernt, sodass die CSS-`prefers-color-scheme`-Regel greift.
 */
export function applyTheme(theme: Theme, root: HTMLElement): void {
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function loadTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
}

export function storeTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}
