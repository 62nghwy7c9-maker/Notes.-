import { useState } from 'react';
import type { LinkType } from '@notes/shared';
import { useUiStore } from '../../app/store.js';
import { Button, Dialog, DialogActions, TextInput } from '../../shared/ui/Dialog.js';
import { useSearch } from '../search/api.js';
import { useCreateLink, useDeleteLink, useNoteLinks } from './api.js';

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  related: 'verwandt',
  builds_on: 'baut auf',
  contradicts: 'widerspricht',
  reference: 'verweist auf',
  part_of: 'gehört zu',
};

function AddLinkDialog({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState('');
  const [type, setType] = useState<LinkType>('related');
  const [reason, setReason] = useState('');
  const search = useSearch(query);
  const createLink = useCreateLink();

  const results = (search.data?.results ?? []).filter((r) => r.noteId !== noteId);

  const submit = () => {
    if (!targetId) return;
    createLink.mutate(
      { sourceId: noteId, targetId, type, reason: reason.trim() || null },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog title="Verknüpfung anlegen" onClose={onClose}>
      {targetId === null ? (
        <>
          <TextInput
            value={query}
            onChange={setQuery}
            placeholder="Notiz suchen…"
            autoFocus
          />
          <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
            {results.map((hit) => (
              <button
                key={hit.noteId}
                type="button"
                onClick={() => {
                  setTargetId(hit.noteId);
                  setTargetTitle(hit.title || 'Ohne Titel');
                }}
                className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-accent-soft"
              >
                {hit.title || 'Ohne Titel'}
                {hit.folderPath && (
                  <span className="ml-2 text-muted">{hit.folderPath}</span>
                )}
              </button>
            ))}
            {query.trim() && results.length === 0 && (
              <p className="p-2 text-[13px] text-muted">Keine Treffer.</p>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px]">
            Verknüpfen mit <b>{targetTitle}</b>
          </p>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LinkType)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px]"
            aria-label="Beziehungstyp"
          >
            {Object.entries(LINK_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <TextInput
            value={reason}
            onChange={setReason}
            placeholder="Begründung (optional, max. 200 Zeichen)"
          />
          {createLink.error && (
            <p className="text-[12px] text-danger">{createLink.error.message}</p>
          )}
        </div>
      )}
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="primary" disabled={!targetId} onClick={submit}>
          Verknüpfen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** „Verbunden (n)"-Bereich unter dem Editor (F-21/24). */
export function LinkedNotes({ noteId }: { noteId: string }) {
  const links = useNoteLinks(noteId);
  const deleteLink = useDeleteLink();
  const { openNote } = useUiStore();
  const [collapsed, setCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const items = links.data?.links ?? [];

  return (
    <div className="mt-8 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-[13px] font-medium text-muted hover:text-text"
        >
          {collapsed ? '▸' : '▾'} Verbunden ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg border border-border px-2 py-0.5 text-[12px] text-muted hover:bg-accent-soft hover:text-text"
        >
          + Verknüpfung
        </button>
      </div>

      {!collapsed && (
        <ul className="mt-2 space-y-1">
          {items.map((link) => (
            <li key={link.id} className="group flex items-center gap-2 text-[13px]">
              <span
                className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent"
                title={link.direction === 'outgoing' ? 'ausgehend' : 'eingehend'}
              >
                {LINK_TYPE_LABEL[link.type]}
                {link.origin === 'wikilink' && ' ⟦⟧'}
                {link.origin === 'ai' && ' ✦'}
              </span>
              <button
                type="button"
                onClick={() => openNote(link.otherNote.id)}
                title={link.reason ?? undefined}
                className="min-w-0 flex-1 truncate text-left hover:text-accent hover:underline"
              >
                {link.otherNote.title || 'Ohne Titel'}
              </button>
              <button
                type="button"
                onClick={() => deleteLink.mutate(link.id)}
                title="Verknüpfung entfernen"
                className="invisible shrink-0 text-muted hover:text-danger group-hover:visible"
              >
                ✕
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-[12px] text-muted">
              Noch keine Verknüpfungen – „+ Verknüpfung" oder [[Wiki-Link]] im Text.
            </li>
          )}
        </ul>
      )}

      {addOpen && <AddLinkDialog noteId={noteId} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
