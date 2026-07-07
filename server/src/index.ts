import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.js';
import { openDatabase } from './db/client.js';
import { loadEnv } from './env.js';
import { cleanupTrash } from './services/noteService.js';

// Bootstrap: Env laden → DB öffnen + migrieren → Hono-App → an 127.0.0.1 binden.
const env = loadEnv();
const { db } = openDatabase(env.DATA_DIR);
const app = createApp({ db, env });

// Produktionsmodus (npm start): gebauten Client mit ausliefern, SPA-Fallback
// auf index.html. /api-Routen sind bereits registriert und haben Vorrang.
const clientDist = join(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(clientDist)) {
  const root = relative(process.cwd(), clientDist);
  app.use('*', serveStatic({ root }));
  app.get('*', serveStatic({ root, path: 'index.html' }));
}

// Papierkorb-Aufräum-Job (F-12): beim Start und danach alle 12 Stunden.
const removed = cleanupTrash(db);
if (removed > 0) console.log(`Papierkorb: ${removed} alte Notiz(en) endgültig entfernt.`);
setInterval(() => cleanupTrash(db), 12 * 60 * 60 * 1000).unref();

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: env.PORT }, (info) => {
  const mode = existsSync(clientDist) ? 'App' : 'API';
  console.log(`Notizen-${mode} läuft auf http://127.0.0.1:${info.port}`);
});
