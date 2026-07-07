import { beforeEach, describe, expect, it } from 'vitest';
import { openInMemory, type Db } from '../db/client.js';
import { ServiceError } from '../lib/errors.js';
import { createFolder } from './folderService.js';
import {
  cleanupTrash,
  createNote,
  getNote,
  hardDeleteNote,
  listNotes,
  listTrash,
  patchNote,
  putNote,
  restoreNote,
  trashNote,
} from './noteService.js';
import { searchNotes } from './searchService.js';

let db: Db;
beforeEach(() => {
  db = openInMemory().db;
});

describe('noteService', () => {
  it('CRUD + Autosave', () => {
    const n = createNote(db, { title: 'Alt', content: 'Text' });
    const saved = putNote(db, n.id, { title: 'Neu', content: 'Mehr Text' });
    expect(saved.title).toBe('Neu');
    expect(getNote(db, n.id).content).toBe('Mehr Text');
  });

  it('listet Eingang (folderId=null) und sortiert Angepinnte zuerst', () => {
    const a = createNote(db, { title: 'Erste' });
    const b = createNote(db, { title: 'Zweite' });
    patchNote(db, a.id, { pinned: true });
    putNote(db, b.id, { title: 'Zweite', content: 'zuletzt geändert' });

    // b ist zuletzt geändert, aber die angepinnte a bleibt oben (F-15).
    const list = listNotes(db, 'inbox');
    expect(list).toHaveLength(2);
    expect(list[0]!.title).toBe('Erste');
    expect(list[0]!.pinned).toBe(true);
  });

  it('includeDescendants liefert Notizen aus Unterordnern mit', () => {
    const a = createFolder(db, { name: 'A' });
    const b = createFolder(db, { name: 'B', parentId: a.id });
    createNote(db, { folderId: a.id, title: 'in A' });
    createNote(db, { folderId: b.id, title: 'in B' });

    expect(listNotes(db, a.id)).toHaveLength(1);
    expect(listNotes(db, a.id, true)).toHaveLength(2);
  });

  it('Papierkorb: löschen → wiederherstellen → endgültig löschen', () => {
    const n = createNote(db, { title: 'Weg damit' });
    trashNote(db, n.id);

    expect(() => getNote(db, n.id)).toThrowError(ServiceError);
    expect(listNotes(db, 'inbox')).toHaveLength(0);
    expect(listTrash(db)).toHaveLength(1);

    restoreNote(db, n.id);
    expect(getNote(db, n.id).title).toBe('Weg damit');

    trashNote(db, n.id);
    hardDeleteNote(db, n.id);
    expect(listTrash(db)).toHaveLength(0);
  });

  it('Aufräum-Job entfernt nur Einträge älter als 30 Tage', () => {
    const alt = createNote(db, { title: 'Alt' });
    const frisch = createNote(db, { title: 'Frisch' });
    trashNote(db, alt.id);
    trashNote(db, frisch.id);

    const in31Tagen = Date.now() + 31 * 24 * 60 * 60 * 1000;
    // "alt" künstlich altern lassen: deleted_at 32 Tage vor "jetzt+31d"? Einfacher:
    // cleanup mit now = jetzt (nichts alt genug), dann mit now = +31 Tage (beide weg).
    expect(cleanupTrash(db, Date.now())).toBe(0);
    expect(cleanupTrash(db, in31Tagen)).toBe(2);
    expect(listTrash(db)).toHaveLength(0);
  });

  it('gelöschte Notizen verschwinden aus der Suche', () => {
    const n = createNote(db, { title: 'Hochbeet', content: 'Planung' });
    expect(searchNotes(db, 'hochbeet')).toHaveLength(1);
    trashNote(db, n.id);
    expect(searchNotes(db, 'hochbeet')).toHaveLength(0);
  });

  it('Suche liefert Snippets mit Hervorhebung und Ordnerpfad', () => {
    const f = createFolder(db, { name: 'Garten' });
    createNote(db, {
      folderId: f.id,
      title: 'Hochbeet-Plan',
      content: 'Im Frühjahr das Hochbeet aus Lärchenholz bauen.',
    });

    const hits = searchNotes(db, 'hochbeet');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.snippet).toContain('<b>');
    expect(hits[0]!.folderPath).toBe('Garten');
  });

  it('Suche ist robust gegen FTS-Sonderzeichen', () => {
    createNote(db, { title: 'Test', content: 'Inhalt' });
    expect(() => searchNotes(db, '"unbalanced AND (')).not.toThrow();
  });
});
