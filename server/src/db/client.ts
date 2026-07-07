import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { migrate } from './migrate.js';

const MAX_BACKUPS = 5;

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export interface OpenedDatabase {
  sqlite: Database.Database;
  db: Db;
}

/**
 * Legt vor einer Migration eine Sicherungskopie `notes.db.bak-<timestamp>` an
 * und hält maximal fünf rotierende Backups (03/04-Datenmodell).
 */
function backupDatabase(file: string): void {
  if (!existsSync(file)) return;

  const dir = join(file, '..');
  const name = basename(file);
  copyFileSync(file, join(dir, `${name}.bak-${Date.now()}`));

  const backups = readdirSync(dir)
    .filter((f) => f.startsWith(`${name}.bak-`))
    .sort();
  for (const stale of backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))) {
    rmSync(join(dir, stale));
  }
}

/**
 * Öffnet die SQLite-Datei (WAL, Foreign Keys), sichert sie bei anstehenden
 * Migrationen und führt diese aus. `:memory:` überspringt Backups.
 */
export function openDatabase(dataDir: string): OpenedDatabase {
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, 'notes.db');

  backupDatabase(file);

  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  migrate(sqlite);

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

/** In-Memory-DB (Tests): frisch migriert, ohne Backup. */
export function openInMemory(): OpenedDatabase {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  migrate(sqlite);
  return { sqlite, db: drizzle(sqlite, { schema }) };
}
