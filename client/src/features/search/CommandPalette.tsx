import { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../app/store.js';
import { useTheme } from '../../app/ThemeProvider.js';
import { THEMES } from '../../app/theme.js';
import { useCreateNote } from '../notes/api.js';
import { useSearch } from './api.js';

/** Nur <b>…</b> aus FTS-Snippets zulassen, alles andere escapen (XSS). */
export function snippetToHtml(snippet: string): string {
  return snippet
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;b&gt;/g, '<b>')
    .replace(/&lt;\/b&gt;/g, '</b>');
}

interface Command {
  id: string;
  label: string;
  run: () => void;
}

/** Command-Palette (Ctrl/Cmd+K): Volltextsuche + Befehle (F-13/51). */
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, select, selection, openNote } = useUiStore();
  const { theme, setTheme } = useTheme();
  const createNote = useCreateNote();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const search = useSearch(paletteOpen ? query : '');

  const commands = useMemo<Command[]>(() => {
    const all: Command[] = [
      {
        id: 'new-note',
        label: '✚ Neue Notiz',
        run: () =>
          createNote.mutate(
            { folderId: selection.kind === 'folder' ? selection.folderId : null },
            {
              onSuccess: (note) => {
                openNote(note.id);
                setPaletteOpen(false);
              },
            },
          ),
      },
      {
        id: 'theme',
        label: `◐ Theme wechseln (aktuell: ${theme})`,
        run: () => {
          setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'system');
        },
      },
      {
        id: 'graph',
        label: '◈ Graph öffnen',
        run: () => {
          select({ kind: 'graph' });
          setPaletteOpen(false);
        },
      },
      {
        id: 'trash',
        label: '🗑 Papierkorb öffnen',
        run: () => {
          select({ kind: 'trash' });
          setPaletteOpen(false);
        },
      },
    ];
    const q = query.trim().toLowerCase();
    return q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
  }, [query, theme, selection, createNote, openNote, select, setPaletteOpen, setTheme]);

  const results = search.data?.results ?? [];
  const rowCount = results.length + commands.length;

  useEffect(() => setActive(0), [query, paletteOpen]);

  useEffect(() => {
    if (!paletteOpen) setQuery('');
  }, [paletteOpen]);

  if (!paletteOpen) return null;

  const activate = (index: number) => {
    if (index < results.length) {
      openNote(results[index]!.noteId);
      setPaletteOpen(false);
    } else {
      commands[index - results.length]?.run();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/30 pt-[15vh]"
      onMouseDown={() => setPaletteOpen(false)}
    >
      <div
        className="h-fit w-[560px] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, rowCount - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              activate(active);
            } else if (e.key === 'Escape') {
              setPaletteOpen(false);
            }
          }}
          placeholder="Notizen durchsuchen oder Befehl…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-[14px] outline-none"
        />
        <div className="max-h-[50vh] overflow-y-auto p-1">
          {results.map((hit, i) => (
            <button
              key={hit.noteId}
              type="button"
              onClick={() => activate(i)}
              onMouseEnter={() => setActive(i)}
              className={`block w-full rounded-lg px-3 py-2 text-left ${
                active === i ? 'bg-accent-soft' : ''
              }`}
            >
              <span className="block truncate text-[13px] font-medium">
                {hit.title || 'Ohne Titel'}
                {hit.folderPath && (
                  <span className="ml-2 font-normal text-muted">{hit.folderPath}</span>
                )}
              </span>
              <span
                className="block truncate text-[12px] text-muted [&_b]:text-accent"
                dangerouslySetInnerHTML={{ __html: snippetToHtml(hit.snippet) }}
              />
            </button>
          ))}
          {results.length > 0 && commands.length > 0 && (
            <div className="my-1 border-t border-border" />
          )}
          {commands.map((cmd, i) => {
            const index = results.length + i;
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => activate(index)}
                onMouseEnter={() => setActive(index)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] ${
                  active === index ? 'bg-accent-soft' : ''
                }`}
              >
                {cmd.label}
              </button>
            );
          })}
          {query.trim() && rowCount === 0 && (
            <p className="p-4 text-center text-[13px] text-muted">Keine Treffer.</p>
          )}
        </div>
      </div>
    </div>
  );
}
