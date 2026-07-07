import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type BetterSqlite3 from 'better-sqlite3';

const defaultMigrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

/**
 * Führt alle noch nicht angewandten `*.sql`-Migrationen in Dateinamen-
 * Reihenfolge aus und protokolliert sie in `__migrations`. Jede Migration
 * läuft in einer eigenen Transaktion. Gibt die Namen der neu angewandten
 * Migrationen zurück.
 */
export function migrate(
  db: BetterSqlite3.Database,
  migrationsDir: string = defaultMigrationsDir,
): string[] {
  db.exec(
    `CREATE TABLE IF NOT EXISTS __migrations (
       name       TEXT PRIMARY KEY,
       applied_at INTEGER NOT NULL
     )`,
  );

  const applied = new Set(
    db
      .prepare('SELECT name FROM __migrations')
      .all()
      .map((row) => (row as { name: string }).name),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const record = db.prepare(
    'INSERT INTO __migrations (name, applied_at) VALUES (?, ?)',
  );
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      record.run(file, Date.now());
    })();
    newlyApplied.push(file);
  }

  return newlyApplied;
}
