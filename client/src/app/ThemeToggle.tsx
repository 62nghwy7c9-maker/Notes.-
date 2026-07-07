import type { Theme } from './theme.js';
import { THEMES } from './theme.js';
import { useTheme } from './ThemeProvider.js';

const LABEL: Record<Theme, string> = {
  light: '☀︎ Hell',
  dark: '☾ Dunkel',
  system: '⌂ System',
};

/** Zyklischer Theme-Umschalter (hell → dunkel → System). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    if (next) setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title="Theme wechseln"
      className="rounded-lg border border-border px-2 py-1 text-[13px] text-muted hover:bg-accent-soft hover:text-text"
    >
      {LABEL[theme]}
    </button>
  );
}
