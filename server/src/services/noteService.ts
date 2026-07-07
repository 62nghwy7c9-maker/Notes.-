import { eq, sql } from 'drizzle-orm';
import type {
  CreateNoteRequest,
  NoteSummary,
  NoteWithTags,
  PatchNoteRequest,
  PutNoteRequest,
  TrashedNote,
} from '@notes/shared';
import type { Db } from '../db/client.js';
import { folders, notes } from '../db/schema.js';
import { notFound } from '../lib/errors.js';
import { uuidv7 } from '../lib/uuid.js';
import { descendantIds } from './folderService.js';

const TRASH_RETENTION_DAYS = 30;

type NoteRow = typeof notes.$inferSelect;

function tagsByNote(db: Db, noteIds: string[]): Map<string, string[]> {
  if (noteIds.length === 0) return new Map();
  const rows = db.all<{ noteId: string; name: string }>(sql`
    SELECT nt.note_id AS noteId, t.name AS name
    FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
    WHERE nt.note_id IN (SELECT value FROM json_each(${JSON.stringify(noteIds)}))
    ORDER BY t.name
  `);
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.noteId) ?? [];
    list.push(r.name);
    map.set(r.noteId, list);
  }
  return map;
}

function requireActiveNote(db: Db, id: string): NoteRow {
  const row = db.select().from(notes).where(eq(notes.id, id)).get();
  if (!row || row.deletedAt !== null) throw notFound('Notiz nicht gefunden.');
  return row;
}

function toNoteWithTags(db: Db, row: NoteRow): NoteWithTags {
  return {
    id: row.id,
    folderId: row.folderId,
    title: row.title,
    content: row.content,
    summary: row.summary,
    pinned: row.pinned === 1,
    organizedAt: row.organizedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: tagsByNote(db, [row.id]).get(row.id) ?? [],
  };
}

/** Notizliste eines Ordners; `folderId='inbox'` = unsortiert (folder_id IS NULL). */
export function listNotes(
  db: Db,
  folderId: string | 'inbox',
  includeDescendants = false,
): NoteSummary[] {
  let rows: NoteRow[];
  if (folderId === 'inbox') {
    rows = db.all<NoteRow>(sql`
      SELECT id, folder_id AS folderId, title, content, summary, pinned,
             organized_at AS organizedAt, deleted_at AS deletedAt,
             created_at AS createdAt, updated_at AS updatedAt
      FROM notes WHERE deleted_at IS NULL AND folder_id IS NULL
    `);
  } else {
    const ids = includeDescendants ? descendantIds(db, folderId) : [folderId];
    if (ids.length === 0) throw notFound('Ordner nicht gefunden.');
    rows = db.all<NoteRow>(sql`
      SELECT id, folder_id AS folderId, title, content, summary, pinned,
             organized_at AS organizedAt, deleted_at AS deletedAt,
             created_at AS createdAt, updated_at AS updatedAt
      FROM notes
      WHERE deleted_at IS NULL
        AND folder_id IN (SELECT value FROM json_each(${JSON.stringify(ids)}))
    `);
  }

  const tags = tagsByNote(db, rows.map((r) => r.id));
  return rows
    .sort((a, b) => b.pinned - a.pinned || b.updatedAt - a.updatedAt)
    .map((r) => ({
      id: r.id,
      folderId: r.folderId,
      title: r.title,
      summary: r.summary,
      pinned: r.pinned === 1,
      tags: tags.get(r.id) ?? [],
      updatedAt: r.updatedAt,
    }));
}

export function getNote(db: Db, id: string): NoteWithTags {
  return toNoteWithTags(db, requireActiveNote(db, id));
}

export function createNote(db: Db, input: CreateNoteRequest): NoteWithTags {
  const folderId = input.folderId ?? null;
  if (folderId !== null) {
    const exists = db.select().from(folders).where(eq(folders.id, folderId)).get();
    if (!exists) throw notFound('Zielordner nicht gefunden.');
  }

  const now = Date.now();
  const row: NoteRow = {
    id: uuidv7(now),
    folderId,
    title: input.title ?? '',
    content: input.content ?? '',
    summary: null,
    pinned: 0,
    organizedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(notes).values(row).run();
  return toNoteWithTags(db, row);
}

/** Autosave (PUT): idempotent, last-write-wins. */
export function putNote(db: Db, id: string, input: PutNoteRequest): NoteWithTags {
  requireActiveNote(db, id);
  const now = Date.now();
  db.update(notes)
    .set({ title: input.title, content: input.content, updatedAt: now })
    .where(eq(notes.id, id))
    .run();
  return getNote(db, id);
}

export function patchNote(db: Db, id: string, input: PatchNoteRequest): NoteWithTags {
  const row = requireActiveNote(db, id);

  let folderId = row.folderId;
  if (input.folderId !== undefined) {
    if (input.folderId !== null) {
      const exists = db.select().from(folders).where(eq(folders.id, input.folderId)).get();
      if (!exists) throw notFound('Zielordner nicht gefunden.');
    }
    folderId = input.folderId;
  }

  db.update(notes)
    .set({
      folderId,
      pinned: input.pinned !== undefined ? (input.pinned ? 1 : 0) : row.pinned,
      updatedAt: Date.now(),
    })
    .where(eq(notes.id, id))
    .run();
  return getNote(db, id);
}

/** In den Papierkorb (F-12). */
export function trashNote(db: Db, id: string): void {
  requireActiveNote(db, id);
  const now = Date.now();
  db.update(notes).set({ deletedAt: now, updatedAt: now }).where(eq(notes.id, id)).run();
}

export function listTrash(db: Db): TrashedNote[] {
  const rows = db.all<{ id: string; title: string; summary: string | null; deletedAt: number }>(sql`
    SELECT id, title, summary, deleted_at AS deletedAt
    FROM notes WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `);
  return rows;
}

export function restoreNote(db: Db, id: string): NoteWithTags {
  const row = db.select().from(notes).where(eq(notes.id, id)).get();
  if (!row || row.deletedAt === null) throw notFound('Notiz nicht im Papierkorb.');
  db.update(notes)
    .set({ deletedAt: null, updatedAt: Date.now() })
    .where(eq(notes.id, id))
    .run();
  return getNote(db, id);
}

export function hardDeleteNote(db: Db, id: string): void {
  const row = db.select().from(notes).where(eq(notes.id, id)).get();
  if (!row || row.deletedAt === null) throw notFound('Notiz nicht im Papierkorb.');
  db.delete(notes).where(eq(notes.id, id)).run();
}

/** Aufräum-Job: Papierkorb-Einträge älter als 30 Tage endgültig löschen. */
export function cleanupTrash(db: Db, now: number = Date.now()): number {
  const cutoff = now - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const result = db.run(sql`
    DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}
  `);
  return Number(result.changes ?? 0);
}
