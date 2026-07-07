import { useState } from 'react';
import type { NoteSummary } from '@notes/shared';
import { useUiStore } from '../../app/store.js';
import { useContextMenu } from '../../shared/ui/ContextMenu.js';
import { Button, Dialog, DialogActions } from '../../shared/ui/Dialog.js';
import { useFolderTree } from '../folders/api.js';
import { findPath, flattenTree } from '../folders/util.js';
import { useCreateNote, useNotes, usePatchNote, useTrashNote } from './api.js';

function MoveDialog({
  note,
  onClose,
}: {
  note: NoteSummary;
  onClose: () => void;
}) {
  const tree = useFolderTree();
  const patchNote = usePatchNote();
  const flat = flattenTree(tree.data?.tree ?? []);

  const move = (folderId: string | null) =>
    patchNote.mutate({ id: note.id, folderId }, { onSuccess: onClose });

  return (
    <Dialog title={`„${note.title || 'Ohne Titel'}" verschieben`} onClose={onClose}>
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        <button
          type="button"
          onClick={() => move(null)}
          className="block w-full rounded-lg px-2 py-1 text-left text-[13px] hover:bg-accent-soft"
        >
          📥 Eingang
        </button>
        {flat.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => move(f.id)}
            className="block w-full whitespace-pre rounded-lg px-2 py-1 text-left text-[13px] hover:bg-accent-soft"
          >
            {f.label}
          </button>
        ))}
      </div>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
      </DialogActions>
    </Dialog>
  );
}

export function NoteList() {
  const { selection, noteId, openNote } = useUiStore();
  const folderId = selection.kind === 'folder' ? selection.folderId : 'inbox';
  const notes = useNotes(folderId);
  const tree = useFolderTree();
  const createNote = useCreateNote();
  const patchNote = usePatchNote();
  const trashNote = useTrashNote();
  const menu = useContextMenu();
  const [moveNote, setMoveNote] = useState<NoteSummary | null>(null);

  const heading =
    selection.kind === 'folder'
      ? (findPath(tree.data?.tree ?? [], selection.folderId)?.split('/').pop() ?? 'Ordner')
      : 'Eingang';

  const newNote = () =>
    createNote.mutate(
      { folderId: selection.kind === 'folder' ? selection.folderId : null },
      { onSuccess: (note) => openNote(note.id) },
    );

  return (
    <section className="flex min-h-0 flex-col border-r border-border">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="truncate text-[13px] font-medium text-muted">
          {heading} ({notes.data?.notes.length ?? 0})
        </h2>
        <button
          type="button"
          onClick={newNote}
          title="Neue Notiz (Ctrl/Cmd+N)"
          className="rounded-lg border border-border px-2 py-0.5 text-[13px] text-muted hover:bg-accent-soft hover:text-text"
        >
          +
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {notes.data?.notes.length === 0 && (
          <p className="p-4 text-center text-[13px] text-muted">
            Noch keine Notizen – „+" oder Ctrl/Cmd+N legt eine an.
          </p>
        )}
        {notes.data?.notes.map((note) => (
          <article
            key={note.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-note-id', note.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => openNote(note.id)}
            onContextMenu={(e) =>
              menu.open(e, [
                {
                  label: note.pinned ? 'Loslösen' : 'Anpinnen',
                  onClick: () => patchNote.mutate({ id: note.id, pinned: !note.pinned }),
                },
                { label: 'Verschieben nach…', onClick: () => setMoveNote(note) },
                {
                  label: 'In den Papierkorb',
                  danger: true,
                  onClick: () => {
                    trashNote.mutate(note.id);
                    if (noteId === note.id) openNote(null);
                  },
                },
              ])
            }
            className={`mb-2 cursor-pointer rounded-lg border p-3 ${
              noteId === note.id
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface hover:border-accent'
            }`}
          >
            <h3 className="truncate text-[14px] font-medium">
              {note.pinned && <span title="Angepinnt">📌 </span>}
              {note.title || 'Ohne Titel'}
            </h3>
            {note.summary && (
              <p className="mt-0.5 truncate text-[12px] text-muted">{note.summary}</p>
            )}
            {note.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {menu.element}
      {moveNote && <MoveDialog note={moveNote} onClose={() => setMoveNote(null)} />}
    </section>
  );
}
