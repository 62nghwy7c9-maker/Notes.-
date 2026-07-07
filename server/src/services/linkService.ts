import { eq, sql } from 'drizzle-orm';
import type {
  CreateLinkRequest,
  Link,
  LinkOrigin,
  NoteLink,
  PatchLinkRequest,
} from '@notes/shared';
import type { Db } from '../db/client.js';
import { links } from '../db/schema.js';
import { conflict, notFound } from '../lib/errors.js';
import { uuidv7 } from '../lib/uuid.js';

type LinkRow = typeof links.$inferSelect;

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    sourceId: row.sourceId,
    targetId: row.targetId,
    type: row.type as Link['type'],
    reason: row.reason,
    origin: row.origin as Link['origin'],
    createdAt: row.createdAt,
  };
}

function requireActiveNote(db: Db, id: string, what: string): void {
  const row = db.get<{ id: string }>(sql`
    SELECT id FROM notes WHERE id = ${id} AND deleted_at IS NULL
  `);
  if (!row) throw notFound(`${what} nicht gefunden.`);
}

/**
 * Paar-symmetrischer Duplikat-Check (Invariante 4 aus 04-datenmodell.md):
 * (A,B) und (B,A) desselben Typs gelten als identisch.
 */
function findPair(db: Db, a: string, b: string, type: string): LinkRow | undefined {
  return db.get<LinkRow>(sql`
    SELECT id, source_id AS sourceId, target_id AS targetId, type, reason, origin,
           created_at AS createdAt
    FROM links
    WHERE type = ${type}
      AND ((source_id = ${a} AND target_id = ${b}) OR (source_id = ${b} AND target_id = ${a}))
  `);
}

export function createLink(
  db: Db,
  input: CreateLinkRequest,
  origin: LinkOrigin = 'manual',
): Link {
  if (input.sourceId === input.targetId)
    throw conflict('Eine Notiz kann nicht mit sich selbst verknüpft werden.');
  requireActiveNote(db, input.sourceId, 'Quellnotiz');
  requireActiveNote(db, input.targetId, 'Zielnotiz');
  if (findPair(db, input.sourceId, input.targetId, input.type))
    throw conflict('Diese Verknüpfung existiert bereits.');

  const now = Date.now();
  const row: LinkRow = {
    id: uuidv7(now),
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    reason: input.reason ?? null,
    origin,
    createdAt: now,
  };
  db.insert(links).values(row).run();
  return toLink(row);
}

export function patchLink(db: Db, id: string, input: PatchLinkRequest): Link {
  const row = db.select().from(links).where(eq(links.id, id)).get();
  if (!row) throw notFound('Verknüpfung nicht gefunden.');

  const type = input.type ?? (row.type as Link['type']);
  if (type !== row.type) {
    const dup = findPair(db, row.sourceId, row.targetId, type);
    if (dup && dup.id !== id) throw conflict('Diese Verknüpfung existiert bereits.');
  }

  const updated = {
    ...row,
    type,
    reason: input.reason !== undefined ? input.reason : row.reason,
  };
  db.update(links).set(updated).where(eq(links.id, id)).run();
  return toLink(updated);
}

export function deleteLink(db: Db, id: string): void {
  const row = db.select().from(links).where(eq(links.id, id)).get();
  if (!row) throw notFound('Verknüpfung nicht gefunden.');
  db.delete(links).where(eq(links.id, id)).run();
}

/** Alle Verknüpfungen einer Notiz, beide Richtungen aufgelöst (F-21). */
export function listLinksForNote(db: Db, noteId: string): NoteLink[] {
  requireActiveNote(db, noteId, 'Notiz');
  const rows = db.all<{
    id: string;
    type: string;
    reason: string | null;
    origin: string;
    direction: string;
    otherId: string;
    otherTitle: string;
    otherSummary: string | null;
  }>(sql`
    SELECT l.id, l.type, l.reason, l.origin,
           CASE WHEN l.source_id = ${noteId} THEN 'outgoing' ELSE 'incoming' END AS direction,
           n.id AS otherId, n.title AS otherTitle, n.summary AS otherSummary
    FROM links l
    JOIN notes n ON n.id = CASE WHEN l.source_id = ${noteId} THEN l.target_id ELSE l.source_id END
    WHERE (l.source_id = ${noteId} OR l.target_id = ${noteId})
      AND n.deleted_at IS NULL
    ORDER BY l.created_at
  `);
  return rows.map((r) => ({
    id: r.id,
    direction: r.direction as NoteLink['direction'],
    type: r.type as NoteLink['type'],
    reason: r.reason,
    origin: r.origin as NoteLink['origin'],
    otherNote: { id: r.otherId, title: r.otherTitle, summary: r.otherSummary },
  }));
}
