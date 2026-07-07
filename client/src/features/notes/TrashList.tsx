import { useState } from 'react';
import type { TrashedNote } from '@notes/shared';
import { Button, Dialog, DialogActions } from '../../shared/ui/Dialog.js';
import { useHardDeleteNote, useRestoreNote, useTrash } from './api.js';

/** Papierkorb (F-12): wiederherstellen oder endgültig löschen. */
export function TrashList() {
  const trash = useTrash(true);
  const restore = useRestoreNote();
  const hardDelete = useHardDeleteNote();
  const [confirm, setConfirm] = useState<TrashedNote | null>(null);

  return (
    <section className="col-span-2 flex min-h-0 flex-col bg-surface">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <h2 className="text-[13px] font-medium text-muted">
          🗑 Papierkorb – automatische Leerung nach 30 Tagen
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {trash.data?.notes.length === 0 && (
          <p className="p-4 text-center text-[13px] text-muted">Der Papierkorb ist leer.</p>
        )}
        {trash.data?.notes.map((note) => (
          <div
            key={note.id}
            className="mb-2 flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px]">{note.title || 'Ohne Titel'}</h3>
              <p className="text-[12px] text-muted">
                Gelöscht am {new Date(note.deletedAt).toLocaleDateString('de-DE')}
              </p>
            </div>
            <Button onClick={() => restore.mutate(note.id)}>Wiederherstellen</Button>
            <Button variant="danger" onClick={() => setConfirm(note)}>
              Endgültig löschen
            </Button>
          </div>
        ))}
      </div>

      {confirm && (
        <Dialog
          title={`„${confirm.title || 'Ohne Titel'}" endgültig löschen?`}
          onClose={() => setConfirm(null)}
        >
          <p className="text-[13px] text-muted">
            Die Notiz wird unwiderruflich gelöscht – das lässt sich nicht rückgängig machen.
          </p>
          <DialogActions>
            <Button onClick={() => setConfirm(null)}>Abbrechen</Button>
            <Button
              variant="danger"
              onClick={() =>
                hardDelete.mutate(confirm.id, { onSuccess: () => setConfirm(null) })
              }
            >
              Endgültig löschen
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </section>
  );
}
