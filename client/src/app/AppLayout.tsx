import { useEffect } from 'react';
import { Sidebar } from '../features/folders/Sidebar.js';
import { GraphView } from '../features/graph/GraphView.js';
import { NoteList } from '../features/notes/NoteList.js';
import { NoteEditor } from '../features/notes/NoteEditor.js';
import { TrashList } from '../features/notes/TrashList.js';
import { CommandPalette } from '../features/search/CommandPalette.js';
import { useCreateNote } from '../features/notes/api.js';
import { useUiStore } from './store.js';

/** Hauptansicht: Sidebar · Notizliste · Editor (07-ui-ux-design.md). */
export function AppLayout() {
  const { selection, openNote, setPaletteOpen } = useUiStore();
  const createNote = useCreateNote();

  // Globale Shortcuts (F-51, M1-Teilmenge): Ctrl/Cmd+K Suche, Ctrl/Cmd+N neue Notiz.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === 'g') {
        e.preventDefault();
        useUiStore.getState().select({ kind: 'graph' });
      } else if (e.key === 'n') {
        e.preventDefault();
        const sel = useUiStore.getState().selection;
        createNote.mutate(
          { folderId: sel.kind === 'folder' ? sel.folderId : null },
          { onSuccess: (note) => openNote(note.id) },
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="grid h-full grid-cols-[240px_288px_1fr] bg-bg text-text">
      <Sidebar />
      {selection.kind === 'trash' ? (
        <TrashList />
      ) : selection.kind === 'graph' ? (
        <GraphView />
      ) : (
        <>
          <NoteList />
          <NoteEditor />
        </>
      )}
      <CommandPalette />
    </div>
  );
}
