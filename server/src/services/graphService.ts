import { sql } from 'drizzle-orm';
import type { GraphResponse } from '@notes/shared';
import type { Db } from '../db/client.js';
import { descendantIds } from './folderService.js';

/** Wurzel-Ordner-Zuordnung: folderId → oberster Vorfahre. */
function rootByFolder(db: Db): Map<string, string> {
  const rows = db.all<{ id: string; parentId: string | null }>(sql`
    SELECT id, parent_id AS parentId FROM folders
  `);
  const parent = new Map(rows.map((r) => [r.id, r.parentId]));
  const roots = new Map<string, string>();
  const resolve = (id: string): string => {
    const cached = roots.get(id);
    if (cached) return cached;
    const p = parent.get(id);
    const root = p ? resolve(p) : id;
    roots.set(id, root);
    return root;
  };
  for (const r of rows) resolve(r.id);
  return roots;
}

/**
 * Kompaktes Graph-Payload (F-22/23): Knoten = aktive Notizen, Kanten =
 * Verknüpfungen dazwischen. Filter: Ordner-Teilbaum und/oder Tag; Kanten
 * werden auf die verbleibende Knotenmenge eingeschränkt.
 */
export function getGraph(
  db: Db,
  filter: { folderId?: string; tag?: string } = {},
): GraphResponse {
  let noteRows = db.all<{ id: string; title: string; folderId: string | null }>(sql`
    SELECT id, title, folder_id AS folderId FROM notes WHERE deleted_at IS NULL
  `);

  if (filter.folderId) {
    const allowed = new Set(descendantIds(db, filter.folderId));
    noteRows = noteRows.filter((n) => n.folderId !== null && allowed.has(n.folderId));
  }
  if (filter.tag) {
    const tagged = new Set(
      db
        .all<{ noteId: string }>(sql`
          SELECT nt.note_id AS noteId FROM note_tags nt
          JOIN tags t ON t.id = nt.tag_id WHERE t.name = ${filter.tag}
        `)
        .map((r) => r.noteId),
    );
    noteRows = noteRows.filter((n) => tagged.has(n.id));
  }

  const nodeIds = new Set(noteRows.map((n) => n.id));
  const edgeRows = db
    .all<{ id: string; source: string; target: string; type: string }>(sql`
      SELECT id, source_id AS source, target_id AS target, type FROM links
    `)
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  const linkCount = new Map<string, number>();
  for (const e of edgeRows) {
    linkCount.set(e.source, (linkCount.get(e.source) ?? 0) + 1);
    linkCount.set(e.target, (linkCount.get(e.target) ?? 0) + 1);
  }

  const roots = rootByFolder(db);
  return {
    nodes: noteRows.map((n) => ({
      id: n.id,
      title: n.title,
      folderRootId: n.folderId ? (roots.get(n.folderId) ?? null) : null,
      linkCount: linkCount.get(n.id) ?? 0,
    })),
    edges: edgeRows.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type as GraphResponse['edges'][number]['type'],
    })),
  };
}

/** Alle Tag-Namen (für den Graph-Filter). */
export function listTags(db: Db): string[] {
  return db
    .all<{ name: string }>(sql`SELECT name FROM tags ORDER BY name`)
    .map((r) => r.name);
}
