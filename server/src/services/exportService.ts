import { sql } from 'drizzle-orm';
import { strToU8, zipSync } from 'fflate';
import type { Db } from '../db/client.js';
import { folderPaths } from './folderService.js';

/** Dateiname aus Notiztitel: verbotene Zeichen raus, Länge begrenzen. */
function toFileName(title: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
  return base || 'Unbenannt';
}

/**
 * Alle (nicht gelöschten) Notizen als Markdown-ZIP in Ordnerstruktur (F-16).
 * Eingang-Notizen liegen unter "Eingang/". Namenskollisionen werden
 * durchnummeriert.
 */
export function exportAllAsZip(db: Db): Uint8Array {
  const rows = db.all<{ title: string; content: string; folderId: string | null }>(sql`
    SELECT title, content, folder_id AS folderId
    FROM notes WHERE deleted_at IS NULL
    ORDER BY created_at
  `);

  const paths = folderPaths(db);
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();

  for (const row of rows) {
    const dir = row.folderId ? (paths.get(row.folderId) ?? 'Eingang') : 'Eingang';
    const name = toFileName(row.title);
    let path = `${dir}/${name}.md`;
    for (let i = 2; used.has(path); i++) path = `${dir}/${name} (${i}).md`;
    used.add(path);

    const body = row.title ? `# ${row.title}\n\n${row.content}` : row.content;
    files[path] = strToU8(body);
  }

  return zipSync(files, { level: 6 });
}
