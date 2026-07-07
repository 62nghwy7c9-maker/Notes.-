import { beforeEach, describe, expect, it } from 'vitest';
import { openInMemory, type Db } from '../db/client.js';
import { ServiceError } from '../lib/errors.js';
import {
  createFolder,
  deleteFolder,
  getFolderTree,
  updateFolder,
} from './folderService.js';
import { createNote, listTrash } from './noteService.js';

let db: Db;
beforeEach(() => {
  db = openInMemory().db;
});

describe('folderService', () => {
  it('legt Ordner an und baut den Baum mit Zählern', () => {
    const projekte = createFolder(db, { name: 'Projekte' });
    const garten = createFolder(db, { name: 'Garten', parentId: projekte.id });
    createNote(db, { folderId: garten.id, title: 'Hochbeet' });
    createNote(db, { folderId: projekte.id, title: 'Übersicht' });

    const tree = getFolderTree(db);
    expect(tree).toHaveLength(1);
    const root = tree[0]!;
    expect(root.name).toBe('Projekte');
    expect(root.noteCount).toBe(1);
    expect(root.totalNoteCount).toBe(2);
    expect(root.children[0]!.name).toBe('Garten');
    expect(root.children[0]!.totalNoteCount).toBe(1);
  });

  it('verhindert Namenskollisionen unter demselben Parent (409)', () => {
    createFolder(db, { name: 'Ideen' });
    expect(() => createFolder(db, { name: 'Ideen' })).toThrowError(ServiceError);
  });

  it('verhindert Zyklen beim Verschieben (409)', () => {
    const a = createFolder(db, { name: 'A' });
    const b = createFolder(db, { name: 'B', parentId: a.id });
    // A in seinen eigenen Nachfahren B verschieben → Zyklus
    expect(() => updateFolder(db, a.id, { parentId: b.id })).toThrowError(/selbst/);
    // A in sich selbst
    expect(() => updateFolder(db, a.id, { parentId: a.id })).toThrowError(ServiceError);
    // Gültig: B an die Wurzel
    expect(updateFolder(db, b.id, { parentId: null }).parentId).toBeNull();
  });

  it('lift: hebt Kinder in den Elternordner', () => {
    const a = createFolder(db, { name: 'A' });
    const b = createFolder(db, { name: 'B', parentId: a.id });
    const c = createFolder(db, { name: 'C', parentId: b.id });
    const note = createNote(db, { folderId: b.id, title: 'In B' });

    deleteFolder(db, b.id, 'lift');
    const tree = getFolderTree(db);
    const rootA = tree[0]!;
    expect(rootA.children.map((k) => k.id)).toContain(c.id);
    // Notiz liegt jetzt in A
    expect(rootA.noteCount).toBe(1);
    expect(note.id).toBeTruthy();
  });

  it('cascade: löscht Teilbaum, Notizen wandern in den Papierkorb', () => {
    const a = createFolder(db, { name: 'A' });
    const b = createFolder(db, { name: 'B', parentId: a.id });
    createNote(db, { folderId: a.id, title: 'in A' });
    createNote(db, { folderId: b.id, title: 'in B' });

    deleteFolder(db, a.id, 'cascade');
    expect(getFolderTree(db)).toHaveLength(0);
    const trash = listTrash(db);
    expect(trash.map((t) => t.title).sort()).toEqual(['in A', 'in B']);
  });
});
