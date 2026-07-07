import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionProps } from '@tiptap/suggestion';
import { searchResponseSchema } from '@notes/shared';

interface WikiItem {
  noteId: string;
  title: string;
}

/**
 * `[[`-Autocomplete (F-14): tippt man `[[…`, erscheint eine Titelauswahl;
 * Auswahl fügt `[[Titel]]` als Text ein. Die Verknüpfung selbst legt der
 * Server beim Autosave an (origin='wikilink').
 */
export const WikiLinkSuggestion = Extension.create({
  name: 'wikiLinkSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion<WikiItem>({
        editor: this.editor,
        char: '[[',
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, `[[${props.title}]] `)
            .run();
        },
        items: async ({ query }) => {
          // Nach dem schließenden ]] ist der Link fertig – kein Popup mehr.
          if (!query.trim() || query.includes(']]') || query.includes('\\]')) return [];
          try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) return [];
            const { results } = searchResponseSchema.parse(await res.json());
            return results
              .filter((r) => r.title.trim().length > 0)
              .slice(0, 8)
              .map((r) => ({ noteId: r.noteId, title: r.title }));
          } catch {
            return [];
          }
        },
        render: () => {
          let el: HTMLDivElement | null = null;
          let current: WikiItem[] = [];
          let selected = 0;
          let command: SuggestionProps<WikiItem>['command'] | null = null;

          const rerender = () => {
            if (!el) return;
            el.innerHTML = '';
            current.forEach((item, i) => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = item.title;
              btn.className = `wiki-suggest-item${i === selected ? ' is-active' : ''}`;
              btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                command?.(item);
              });
              el!.appendChild(btn);
            });
          };

          const position = (rect: DOMRect | null) => {
            if (!el || !rect) return;
            el.style.left = `${rect.left}px`;
            el.style.top = `${rect.bottom + 4}px`;
          };

          return {
            onStart: (props) => {
              current = props.items;
              selected = 0;
              command = props.command;
              el = document.createElement('div');
              el.className = 'wiki-suggest';
              document.body.appendChild(el);
              rerender();
              position(props.clientRect?.() ?? null);
              if (current.length === 0) el.style.display = 'none';
            },
            onUpdate: (props) => {
              current = props.items;
              selected = Math.min(selected, Math.max(0, current.length - 1));
              command = props.command;
              rerender();
              position(props.clientRect?.() ?? null);
              if (el) el.style.display = current.length === 0 ? 'none' : 'block';
            },
            onKeyDown: ({ event }) => {
              if (current.length === 0) return false;
              if (event.key === 'ArrowDown') {
                selected = (selected + 1) % current.length;
                rerender();
                return true;
              }
              if (event.key === 'ArrowUp') {
                selected = (selected - 1 + current.length) % current.length;
                rerender();
                return true;
              }
              if (event.key === 'Enter') {
                command?.(current[selected]!);
                return true;
              }
              if (event.key === 'Escape') {
                if (el) el.style.display = 'none';
                return true;
              }
              return false;
            },
            onExit: () => {
              el?.remove();
              el = null;
            },
          };
        },
      }),
    ];
  },
});
