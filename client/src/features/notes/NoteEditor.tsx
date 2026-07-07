import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from 'tiptap-markdown';
import { useUiStore } from '../../app/store.js';
import { useFolderTree } from '../folders/api.js';
import { findPath } from '../folders/util.js';
import { LinkedNotes } from '../links/LinkedNotes.js';
import { useNote, useSaveNote } from './api.js';
import { WikiLinkSuggestion } from './wikiLinkSuggestion.js';

type SaveState = 'saved' | 'pending' | 'saving';

const AUTOSAVE_DELAY_MS = 800;

/**
 * Editor mit Titelzeile, TipTap-Fläche (Markdown-Live-Rendering) und
 * debounced Autosave (F-10/11). Der Speicherstatus hängt oben rechts.
 */
export function NoteEditor() {
  const { noteId } = useUiStore();
  const note = useNote(noteId);
  const save = useSaveNote();
  const tree = useFolderTree();

  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Letzter dem Editor bekannter Stand, um Fremd-Refetches nicht einzuspielen.
  const loadedNoteId = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Schreib los … (Markdown wird live gerendert)' }),
      Markdown.configure({ html: false, transformPastedText: true }),
      WikiLinkSuggestion,
    ],
    editorProps: {
      attributes: { class: 'tiptap-content focus:outline-none' },
    },
    onUpdate: () => scheduleSave(),
  });

  const doSave = useCallback(() => {
    // Wichtig: immer die Notiz speichern, deren Inhalt im Editor GELADEN ist –
    // nicht die aktuell ausgewählte. Sonst schreibt der Flush beim schnellen
    // Notizwechsel alten Inhalt in die neu geöffnete Notiz.
    const id = loadedNoteId.current;
    if (!id || !editor) return;
    // tiptap-markdown liefert keine Typen für seinen Storage-Eintrag.
    const markdown = (
      editor.storage as unknown as { markdown: { getMarkdown: () => string } }
    ).markdown.getMarkdown();
    setSaveState('saving');
    save.mutate(
      { id, title, content: markdown },
      {
        onSuccess: () => setSaveState('saved'),
        onError: () => setSaveState('pending'),
      },
    );
  }, [editor, title, save]);

  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  const scheduleSave = useCallback(() => {
    setSaveState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      doSaveRef.current();
    }, AUTOSAVE_DELAY_MS);
  }, []);

  // Notizwechsel: Inhalt in den Editor laden (nicht bei jedem Refetch).
  useEffect(() => {
    if (!editor || !note.data) return;
    if (loadedNoteId.current === note.data.id) return;
    loadedNoteId.current = note.data.id;
    setTitle(note.data.title);
    editor.commands.setContent(note.data.content);
    setSaveState('saved');
  }, [editor, note.data]);

  // Beim Schließen/Wechseln ausstehende Änderung sofort sichern (Flush).
  // Läuft vor dem Laden der neuen Notiz; loadedNoteId zeigt noch auf die alte.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        doSaveRef.current();
      }
    },
    [noteId],
  );

  if (!noteId) {
    return (
      <section className="flex min-h-0 flex-col items-center justify-center bg-surface">
        <p className="max-w-[26ch] text-center text-[13px] leading-relaxed text-muted">
          Keine Notiz geöffnet. Wähle links eine aus – oder Ctrl/Cmd+N für eine neue.
        </p>
      </section>
    );
  }

  const folderPath = note.data?.folderId
    ? (findPath(tree.data?.tree ?? [], note.data.folderId) ?? '')
    : 'Eingang';
  const statusLabel = { saved: 'Gespeichert ✓', pending: '…', saving: 'Speichert…' }[saveState];

  return (
    <section className="flex min-h-0 flex-col bg-surface">
      <header className="flex h-12 shrink-0 items-center justify-between px-6 text-[12px] text-muted">
        <span className="truncate" title={folderPath}>
          {folderPath}
        </span>
        <span aria-live="polite">{statusLabel}</span>
      </header>
      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave();
          }}
          placeholder="Titel"
          aria-label="Titel"
          className="w-full bg-transparent text-[30px] font-bold outline-none placeholder:text-muted"
        />
        <EditorContent editor={editor} className="mt-3" />
        <LinkedNotes noteId={noteId} />
      </div>
    </section>
  );
}
