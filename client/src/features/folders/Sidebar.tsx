import { useState } from 'react';
import type { FolderTreeNode } from '@notes/shared';
import { useUiStore } from '../../app/store.js';
import { ThemeToggle } from '../../app/ThemeToggle.js';
import { useContextMenu } from '../../shared/ui/ContextMenu.js';
import { Button, Dialog, DialogActions, TextInput } from '../../shared/ui/Dialog.js';
import { usePatchNote, useNotes } from '../notes/api.js';
import { useCreateFolder, useDeleteFolder, useFolderTree, useUpdateFolder } from './api.js';

/** Dialog-Zustände der Sidebar. */
type DialogState =
  | { kind: 'create'; parentId: string | null }
  | { kind: 'rename'; folder: FolderTreeNode }
  | { kind: 'delete'; folder: FolderTreeNode }
  | null;

function FolderRow({
  node,
  depth,
  expanded,
  toggle,
  onMenu,
  onDropNote,
  onDropFolder,
}: {
  node: FolderTreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onMenu: (e: React.MouseEvent, node: FolderTreeNode) => void;
  onDropNote: (noteId: string, folderId: string) => void;
  onDropFolder: (folderId: string, parentId: string) => void;
}) {
  const { selection, select } = useUiStore();
  const [dragOver, setDragOver] = useState(false);
  const isOpen = expanded.has(node.id);
  const active = selection.kind === 'folder' && selection.folderId === node.id;

  return (
    <>
      <div
        role="treeitem"
        aria-selected={active}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-folder-id', node.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (
            e.dataTransfer.types.includes('application/x-note-id') ||
            e.dataTransfer.types.includes('application/x-folder-id')
          ) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const noteId = e.dataTransfer.getData('application/x-note-id');
          const folderId = e.dataTransfer.getData('application/x-folder-id');
          if (noteId) onDropNote(noteId, node.id);
          else if (folderId && folderId !== node.id) onDropFolder(folderId, node.id);
        }}
        onClick={() => select({ kind: 'folder', folderId: node.id })}
        onContextMenu={(e) => onMenu(e, node)}
        className={`flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[13px] ${
          active ? 'bg-accent-soft text-accent' : 'hover:bg-accent-soft'
        } ${dragOver ? 'outline outline-1 outline-accent' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button
          type="button"
          aria-label={isOpen ? 'Einklappen' : 'Ausklappen'}
          onClick={(e) => {
            e.stopPropagation();
            toggle(node.id);
          }}
          className={`w-4 shrink-0 text-muted ${node.children.length === 0 ? 'invisible' : ''}`}
        >
          {isOpen ? '▾' : '▸'}
        </button>
        <span className="shrink-0">{node.icon ?? '📁'}</span>
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.totalNoteCount > 0 && (
          <span className="text-[11px] text-muted">{node.totalNoteCount}</span>
        )}
      </div>
      {isOpen &&
        node.children.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            onMenu={onMenu}
            onDropNote={onDropNote}
            onDropFolder={onDropFolder}
          />
        ))}
    </>
  );
}

export function Sidebar() {
  const { selection, select, setPaletteOpen } = useUiStore();
  const tree = useFolderTree();
  const inbox = useNotes('inbox');
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const patchNote = usePatchNote();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [strategy, setStrategy] = useState<'cascade' | 'lift'>('lift');
  const [inboxDragOver, setInboxDragOver] = useState(false);
  const menu = useContextMenu();

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openMenu = (e: React.MouseEvent, node: FolderTreeNode) =>
    menu.open(e, [
      {
        label: 'Neuer Unterordner…',
        onClick: () => {
          setName('');
          setIcon('');
          setDialog({ kind: 'create', parentId: node.id });
        },
      },
      {
        label: 'Umbenennen…',
        onClick: () => {
          setName(node.name);
          setIcon(node.icon ?? '');
          setDialog({ kind: 'rename', folder: node });
        },
      },
      {
        label: 'Löschen…',
        danger: true,
        onClick: () => {
          setStrategy('lift');
          setDialog({ kind: 'delete', folder: node });
        },
      },
    ]);

  const submitDialog = () => {
    if (!dialog) return;
    if (dialog.kind === 'create' && name.trim()) {
      createFolder.mutate(
        { name: name.trim(), parentId: dialog.parentId, icon: icon.trim() || null },
        { onSuccess: () => setDialog(null) },
      );
    } else if (dialog.kind === 'rename' && name.trim()) {
      updateFolder.mutate(
        { id: dialog.folder.id, name: name.trim(), icon: icon.trim() || null },
        { onSuccess: () => setDialog(null) },
      );
    }
  };

  const navButton = (
    label: string,
    active: boolean,
    onClick: () => void,
    badge?: number,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[13px] ${
        active ? 'bg-accent-soft text-accent' : 'hover:bg-accent-soft'
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-accent-soft px-1.5 text-[11px] text-accent">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-surface">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="rounded-lg border border-border px-2 py-1 text-[13px] text-muted hover:bg-accent-soft"
          title="Suche (Ctrl/Cmd+K)"
        >
          ⌕ Suche…
        </button>
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto p-2" role="tree">
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-note-id')) {
              e.preventDefault();
              setInboxDragOver(true);
            }
          }}
          onDragLeave={() => setInboxDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setInboxDragOver(false);
            const noteId = e.dataTransfer.getData('application/x-note-id');
            if (noteId) patchNote.mutate({ id: noteId, folderId: null });
          }}
          className={inboxDragOver ? 'rounded-lg outline outline-1 outline-accent' : ''}
        >
          {navButton(
            '📥 Eingang',
            selection.kind === 'inbox',
            () => select({ kind: 'inbox' }),
            inbox.data?.notes.length,
          )}
        </div>

        <div className="my-2 border-t border-border" />

        {tree.data?.tree.map((node) => (
          <FolderRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            onMenu={openMenu}
            onDropNote={(noteId, folderId) => patchNote.mutate({ id: noteId, folderId })}
            onDropFolder={(folderId, parentId) =>
              updateFolder.mutate({ id: folderId, parentId })
            }
          />
        ))}

        <button
          type="button"
          onClick={() => {
            setName('');
            setIcon('');
            setDialog({ kind: 'create', parentId: null });
          }}
          className="mt-1 w-full rounded-lg px-2 py-1 text-left text-[13px] text-muted hover:bg-accent-soft"
        >
          + Neuer Ordner
        </button>
      </nav>

      <div className="shrink-0 border-t border-border p-2">
        {navButton('🗑 Papierkorb', selection.kind === 'trash', () =>
          select({ kind: 'trash' }),
        )}
        <a
          href="/api/export"
          download
          className="block w-full rounded-lg px-2 py-1 text-[13px] text-muted hover:bg-accent-soft"
        >
          ⤓ Export (Markdown-ZIP)
        </a>
      </div>

      {menu.element}

      {(dialog?.kind === 'create' || dialog?.kind === 'rename') && (
        <Dialog
          title={dialog.kind === 'create' ? 'Neuer Ordner' : 'Ordner umbenennen'}
          onClose={() => setDialog(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitDialog();
            }}
          >
            <div className="flex gap-2">
              <div className="w-16">
                <TextInput value={icon} onChange={setIcon} placeholder="🌱" />
              </div>
              <div className="flex-1">
                <TextInput value={name} onChange={setName} placeholder="Name" autoFocus />
              </div>
            </div>
            {(createFolder.error ?? updateFolder.error) && (
              <p className="mt-2 text-[12px] text-danger">
                {(createFolder.error ?? updateFolder.error)?.message}
              </p>
            )}
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Abbrechen</Button>
              <Button type="submit" variant="primary" disabled={!name.trim()}>
                {dialog.kind === 'create' ? 'Anlegen' : 'Speichern'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {dialog?.kind === 'delete' && (
        <Dialog title={`„${dialog.folder.name}" löschen?`} onClose={() => setDialog(null)}>
          <div className="space-y-2 text-[13px]">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                checked={strategy === 'lift'}
                onChange={() => setStrategy('lift')}
                className="mt-0.5"
              />
              <span>
                Inhalt in den Elternordner verschieben
                <span className="block text-muted">
                  Unterordner und Notizen bleiben erhalten.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                checked={strategy === 'cascade'}
                onChange={() => setStrategy('cascade')}
                className="mt-0.5"
              />
              <span>
                Inhalt mitlöschen
                <span className="block text-muted">
                  {dialog.folder.totalNoteCount} Notiz(en) wandern in den Papierkorb.
                </span>
              </span>
            </label>
          </div>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>Abbrechen</Button>
            <Button
              variant="danger"
              onClick={() =>
                deleteFolder.mutate(
                  { id: dialog.folder.id, strategy },
                  { onSuccess: () => setDialog(null) },
                )
              }
            >
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </aside>
  );
}
