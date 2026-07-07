import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { settings } from '../db/schema.js';

/** Liest einen Einstellungswert; `undefined`, falls nicht gesetzt. */
export function getSetting(db: Db, key: string): string | undefined {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .get();
  return row?.value;
}

/** Setzt (oder aktualisiert) einen Einstellungswert. */
export function setSetting(db: Db, key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}
