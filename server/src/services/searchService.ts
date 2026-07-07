import { sql } from 'drizzle-orm';
import type { SearchResult } from '@notes/shared';
import type { Db } from '../db/client.js';
import { folderPaths } from './folderService.js';

const MAX_RESULTS = 50;

/**
 * Baut aus freier Nutzereingabe eine sichere FTS5-MATCH-Query:
 * Wörter werden als Präfix-Phrasen ("wort"*) UND-verknüpft — keine
 * FTS-Sonderzeichen-Interpretation der Rohdaten.
 */
export function toFtsQuery(input: string): string {
  const tokens = input
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  return tokens.map((t) => `"${t}"*`).join(' ');
}

/** FTS5-Volltextsuche über Titel + Inhalt mit Snippets (F-13). */
export function searchNotes(db: Db, query: string): SearchResult[] {
  const match = toFtsQuery(query);
  if (!match) return [];

  const rows = db.all<{ noteId: string; title: string; snippet: string; folderId: string | null }>(sql`
    SELECT n.id AS noteId, n.title AS title,
           snippet(notes_fts, 1, '<b>', '</b>', '…', 12) AS snippet,
           n.folder_id AS folderId
    FROM notes_fts
    JOIN notes n ON n.rowid = notes_fts.rowid
    WHERE notes_fts MATCH ${match} AND n.deleted_at IS NULL
    ORDER BY rank
    LIMIT ${MAX_RESULTS}
  `);

  const paths = folderPaths(db);
  return rows.map((r) => ({
    noteId: r.noteId,
    title: r.title,
    snippet: r.snippet,
    folderPath: r.folderId ? (paths.get(r.folderId) ?? '') : '',
  }));
}
