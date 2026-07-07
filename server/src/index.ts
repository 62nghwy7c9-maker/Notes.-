import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { openDatabase } from './db/client.js';
import { loadEnv } from './env.js';

// Bootstrap: Env laden → DB öffnen + migrieren → Hono-App → an 127.0.0.1 binden.
const env = loadEnv();
const { db } = openDatabase(env.DATA_DIR);
const app = createApp({ db, env });

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: env.PORT }, (info) => {
  console.log(`Notizen-Server läuft auf http://127.0.0.1:${info.port}`);
});
