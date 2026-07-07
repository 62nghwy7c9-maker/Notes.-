import { defineConfig } from 'drizzle-kit';

// Drizzle-Kit generiert Schema-Diff-Migrationen nach server/src/db/migrations/.
// FTS5-Tabellen und -Trigger werden von Drizzle nicht abgebildet und daher
// weiterhin von Hand in den nummerierten SQL-Migrationen gepflegt.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
