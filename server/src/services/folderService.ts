import { eq, sql } from 'drizzle-orm';
import type {
  CreateFolderRequest,
  Folder,
  FolderTreeNode,
  UpdateFolderRequest,
} from '@notes/shared';
import type { Db } from '../db/client.js';
import { folders, notes } from '../db/schema.js';
import { conflict, notFound } from '../lib/errors.js';
import { uuidv7 } from '../lib/uuid.js';

type FolderRow = typeof folders.$inferSelect;

function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    icon: row.icon,
    description: row.description,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes('UNIQUE constraint failed');
}

function requireFolder(db: Db, id: string): FolderRow {
  const row = db.select().from(folders).where(eq(folders.id, id)).get();
  if (!row) throw notFound('Ordner nicht gefunden.');
  return row;
}

/**
 * Expliziter Duplikat-Check: der UNIQUE(parent_id, name)-Constraint greift
 * bei parent_id IS NULL nicht (SQLite behandelt NULLs als verschieden).
 */
function assertNameFree(db: Db, parentId: string | null, name: string, exceptId?: string): void {
  const hit = db.get<{ id: string }>(sql`
    SELECT id FROM folders
    WHERE parent_id IS ${parentId} AND name = ${name}
      AND id IS NOT ${exceptId ?? null}
  `);
  if (hit) throw conflict(`Es gibt hier bereits einen Ordner namens „${name}".`);
}

/** IDs des Ordners und aller Nachfahren (rekursive CTE). */
export function descendantIds(db: Db, id: string): string[] {
  const rows = db.all<{ id: string }>(sql`
    WITH RECURSIVE sub(id) AS (
      SELECT id FROM folders WHERE id = ${id}
      UNION ALL
      SELECT f.id FROM folders f JOIN sub s ON f.parent_id = s.id
    )
    SELECT id FROM sub
  `);
  return rows.map((r) => r.id);
}

export function createFolder(db: Db, input: CreateFolderRequest): Folder {
  const parentId = input.parentId ?? null;
  if (parentId !== null) requireFolder(db, parentId);
  assertNameFree(db, parentId, input.name);

  const maxPos = db.get<{ max: number | null }>(sql`
    SELECT MAX(position) AS max FROM folders
    WHERE parent_id IS ${parentId}
  `);

  const now = Date.now();
  const row: FolderRow = {
    id: uuidv7(now),
    parentId,
    name: input.name,
    icon: input.icon ?? null,
    description: input.description ?? null,
    position: (maxPos?.max ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };

  try {
    db.insert(folders).values(row).run();
  } catch (err) {
    if (isUniqueViolation(err))
      throw conflict(`Es gibt hier bereits einen Ordner namens „${input.name}".`);
    throw err;
  }
  return toFolder(row);
}

export function updateFolder(db: Db, id: string, input: UpdateFolderRequest): Folder {
  const row = requireFolder(db, id);

  let parentId = row.parentId;
  if (input.parentId !== undefined) {
    // Zyklen-Check: Ziel darf weder der Ordner selbst noch ein Nachfahre sein.
    if (input.parentId !== null) {
      if (descendantIds(db, id).includes(input.parentId))
        throw conflict('Ein Ordner kann nicht in sich selbst verschoben werden.');
      requireFolder(db, input.parentId);
    }
    parentId = input.parentId;
  }

  const newName = input.name ?? row.name;
  if (newName !== row.name || parentId !== row.parentId)
    assertNameFree(db, parentId, newName, id);

  const updated: FolderRow = {
    ...row,
    parentId,
    name: input.name ?? row.name,
    icon: input.icon !== undefined ? input.icon : row.icon,
    description: input.description !== undefined ? input.description : row.description,
    position: input.position ?? row.position,
    updatedAt: Date.now(),
  };

  try {
    db.update(folders).set(updated).where(eq(folders.id, id)).run();
  } catch (err) {
    if (isUniqueViolation(err))
      throw conflict(`Es gibt am Zielort bereits einen Ordner namens „${updated.name}".`);
    throw err;
  }
  return toFolder(updated);
}

/**
 * Löschen mit Strategie (F-04):
 * - `cascade`: alle Notizen im Teilbaum wandern in den Papierkorb, der
 *   Ordner-Teilbaum wird gelöscht (FK-CASCADE entfernt Unterordner).
 * - `lift`: direkte Kinder (Ordner + Notizen) rücken in den Elternordner auf.
 */
export function deleteFolder(db: Db, id: string, strategy: 'cascade' | 'lift'): void {
  const row = requireFolder(db, id);
  const now = Date.now();

  if (strategy === 'cascade') {
    const ids = descendantIds(db, id);
    db.run(sql`
      UPDATE notes SET deleted_at = ${now}, updated_at = ${now}
      WHERE deleted_at IS NULL
        AND folder_id IN (SELECT value FROM json_each(${JSON.stringify(ids)}))
    `);
    db.delete(folders).where(eq(folders.id, id)).run();
    return;
  }

  // lift: Namenskollisionen unter dem neuen Parent vorab prüfen → 409
  const children = db.all<{ name: string }>(sql`
    SELECT name FROM folders WHERE parent_id = ${id}
  `);
  for (const child of children) assertNameFree(db, row.parentId, child.name);
  db.run(sql`
    UPDATE folders SET parent_id = ${row.parentId}, updated_at = ${now}
    WHERE parent_id = ${id}
  `);
  db.update(notes)
    .set({ folderId: row.parentId, updatedAt: now })
    .where(eq(notes.folderId, id))
    .run();
  db.delete(folders).where(eq(folders.id, id)).run();
}

/** Kompletter Baum inkl. Notizanzahl pro Ordner und kumuliert (F-05). */
export function getFolderTree(db: Db): FolderTreeNode[] {
  const rows = db.select().from(folders).all();
  const counts = db.all<{ folderId: string; c: number }>(sql`
    SELECT folder_id AS folderId, COUNT(*) AS c FROM notes
    WHERE deleted_at IS NULL AND folder_id IS NOT NULL
    GROUP BY folder_id
  `);
  const countByFolder = new Map(counts.map((r) => [r.folderId, r.c]));

  const nodes = new Map<string, FolderTreeNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      icon: row.icon,
      description: row.description,
      position: row.position,
      noteCount: countByFolder.get(row.id) ?? 0,
      totalNoteCount: 0,
      children: [],
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (list: FolderTreeNode[]): void => {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'de'));
    for (const n of list) sortRec(n.children);
  };
  const sumRec = (node: FolderTreeNode): number => {
    node.totalNoteCount =
      node.noteCount + node.children.reduce((acc, c) => acc + sumRec(c), 0);
    return node.totalNoteCount;
  };
  sortRec(roots);
  for (const r of roots) sumRec(r);
  return roots;
}

/** Pfad eines Ordners, z. B. "Projekte/Garten" (für Suche/Breadcrumb). */
export function folderPaths(db: Db): Map<string, string> {
  const rows = db.select().from(folders).all();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const paths = new Map<string, string>();

  const resolve = (id: string): string => {
    const cached = paths.get(id);
    if (cached !== undefined) return cached;
    const row = byId.get(id);
    if (!row) return '';
    const path = row.parentId ? `${resolve(row.parentId)}/${row.name}` : row.name;
    paths.set(id, path);
    return path;
  };

  for (const row of rows) resolve(row.id);
  return paths;
}
