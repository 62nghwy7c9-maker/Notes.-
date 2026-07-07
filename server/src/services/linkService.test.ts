import { beforeEach, describe, expect, it } from 'vitest';
import { openInMemory, type Db } from '../db/client.js';
import { ServiceError } from '../lib/errors.js';
import { createFolder } from './folderService.js';
import { getGraph } from './graphService.js';
import { createLink, deleteLink, listLinksForNote, patchLink } from './linkService.js';
import { createNote, getNote, putNote, trashNote } from './noteService.js';

let db: Db;
beforeEach(() => {
  db = openInMemory().db;
});

describe('linkService', () => {
  it('legt Verknüpfungen an und löst beide Richtungen auf', () => {
    const a = createNote(db, { title: 'A' });
    const b = createNote(db, { title: 'B' });
    createLink(db, { sourceId: a.id, targetId: b.id, type: 'builds_on', reason: 'x' });

    const fromA = listLinksForNote(db, a.id);
    const fromB = listLinksForNote(db, b.id);
    expect(fromA[0]!.direction).toBe('outgoing');
    expect(fromA[0]!.otherNote.title).toBe('B');
    expect(fromB[0]!.direction).toBe('incoming');
    expect(fromB[0]!.otherNote.title).toBe('A');
  });

  it('paar-symmetrischer Duplikat-Check: (B,A) gleichen Typs → 409', () => {
    const a = createNote(db, { title: 'A' });
    const b = createNote(db, { title: 'B' });
    createLink(db, { sourceId: a.id, targetId: b.id, type: 'related' });

    expect(() =>
      createLink(db, { sourceId: b.id, targetId: a.id, type: 'related' }),
    ).toThrowError(/existiert bereits/);
    // Anderer Typ ist erlaubt
    expect(() =>
      createLink(db, { sourceId: b.id, targetId: a.id, type: 'contradicts' }),
    ).not.toThrow();
  });

  it('verhindert Selbst-Verknüpfung und tote Ziele', () => {
    const a = createNote(db, { title: 'A' });
    expect(() =>
      createLink(db, { sourceId: a.id, targetId: a.id, type: 'related' }),
    ).toThrowError(ServiceError);
    expect(() =>
      createLink(db, { sourceId: a.id, targetId: 'nix', type: 'related' }),
    ).toThrowError(ServiceError);
  });

  it('patcht Typ/Begründung und löscht', () => {
    const a = createNote(db, { title: 'A' });
    const b = createNote(db, { title: 'B' });
    const link = createLink(db, { sourceId: a.id, targetId: b.id, type: 'related' });

    const patched = patchLink(db, link.id, { type: 'part_of', reason: 'gehört dazu' });
    expect(patched.type).toBe('part_of');

    deleteLink(db, link.id);
    expect(listLinksForNote(db, a.id)).toHaveLength(0);
  });

  it('blendet Verknüpfungen zu Papierkorb-Notizen aus, ohne sie zu löschen', () => {
    const a = createNote(db, { title: 'A' });
    const b = createNote(db, { title: 'B' });
    createLink(db, { sourceId: a.id, targetId: b.id, type: 'related' });

    trashNote(db, b.id);
    expect(listLinksForNote(db, a.id)).toHaveLength(0);
  });
});

describe('Wiki-Links (F-14)', () => {
  it('erzeugt und entfernt wikilink-Verknüpfungen beim Speichern', () => {
    const boden = createNote(db, { title: 'Bodenqualität' });
    const plan = createNote(db, { title: 'Plan' });

    putNote(db, plan.id, { title: 'Plan', content: 'Siehe [[Bodenqualität]].' });
    let links = listLinksForNote(db, plan.id);
    expect(links).toHaveLength(1);
    expect(links[0]!.origin).toBe('wikilink');
    expect(links[0]!.type).toBe('reference');
    expect(links[0]!.otherNote.id).toBe(boden.id);

    // Verweis entfernt → Verknüpfung verschwindet
    putNote(db, plan.id, { title: 'Plan', content: 'Kein Verweis mehr.' });
    links = listLinksForNote(db, plan.id);
    expect(links).toHaveLength(0);
  });

  it('akzeptiert die escapte TipTap-Schreibweise \\[\\[Titel\\]\\]', () => {
    const ziel = createNote(db, { title: 'Wegwerf-Notiz' });
    const plan = createNote(db, { title: 'Plan' });
    putNote(db, plan.id, {
      title: 'Plan',
      content: 'Siehe auch \\[\\[Wegwerf-Notiz\\]\\] hier.',
    });
    const links = listLinksForNote(db, plan.id);
    expect(links).toHaveLength(1);
    expect(links[0]!.otherNote.id).toBe(ziel.id);
  });

  it('hält Wiki-Links bei Umbenennung synchron', () => {
    createNote(db, { title: 'Bodenqualität' });
    const boden = createNote(db, { title: 'Kompost' });
    const plan = createNote(db, { title: 'Plan' });
    putNote(db, plan.id, { title: 'Plan', content: 'Siehe [[Kompost]].' });

    // Zielnotiz umbenennen → [[Kompost]] wird in "Plan" zu [[Kompost & Humus]]
    putNote(db, boden.id, { title: 'Kompost & Humus', content: '' });
    const updated = listLinksForNote(db, plan.id);
    expect(updated).toHaveLength(1);
    expect(updated[0]!.otherNote.title).toBe('Kompost & Humus');
    expect(getNote(db, plan.id).content).toContain('[[Kompost & Humus]]');
  });
});

describe('Graph-Payload (F-22)', () => {
  it('liefert Knoten mit Wurzelordner + linkCount und gefilterte Kanten', () => {
    const projekte = createFolder(db, { name: 'Projekte' });
    const garten = createFolder(db, { name: 'Garten', parentId: projekte.id });
    const a = createNote(db, { folderId: garten.id, title: 'A' });
    const b = createNote(db, { title: 'B' }); // Eingang
    createLink(db, { sourceId: a.id, targetId: b.id, type: 'related' });

    const graph = getGraph(db);
    expect(graph.nodes).toHaveLength(2);
    const nodeA = graph.nodes.find((n) => n.id === a.id)!;
    expect(nodeA.folderRootId).toBe(projekte.id);
    expect(nodeA.linkCount).toBe(1);
    expect(graph.edges).toHaveLength(1);

    // Ordner-Filter: nur A bleibt, Kante fällt weg (B außerhalb)
    const filtered = getGraph(db, { folderId: projekte.id });
    expect(filtered.nodes.map((n) => n.id)).toEqual([a.id]);
    expect(filtered.edges).toHaveLength(0);
  });

  it('lässt Papierkorb-Notizen aus', () => {
    const a = createNote(db, { title: 'A' });
    const b = createNote(db, { title: 'B' });
    createLink(db, { sourceId: a.id, targetId: b.id, type: 'related' });
    trashNote(db, b.id);

    const graph = getGraph(db);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });
});
