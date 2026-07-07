import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiError } from '@notes/shared';
import { errorStatusByCode } from '@notes/shared';
import type { Db } from './db/client.js';
import type { Env } from './env.js';
import { ServiceError } from './lib/errors.js';
import { registerHealthRoute } from './routes/health.js';
import { registerFolderRoutes } from './routes/folders.js';
import { registerNoteRoutes } from './routes/notes.js';
import { registerSearchRoute } from './routes/search.js';
import { registerExportRoute } from './routes/export.js';

export const APP_VERSION = '0.1.0';

export interface AppDeps {
  db: Db;
  env: Env;
}

/** Baut die Hono-App mit allen Routen unter `/api`. */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const api = new Hono();

  registerHealthRoute(api, deps);
  registerFolderRoutes(api, deps);
  registerNoteRoutes(api, deps);
  registerSearchRoute(api, deps);
  registerExportRoute(api, deps);

  app.route('/api', api);

  app.onError((err, c) => {
    if (err instanceof ServiceError) {
      const body: ApiError = { error: { code: err.code, message: err.message } };
      return c.json(body, errorStatusByCode[err.code] as 400);
    }
    if (err instanceof HTTPException) return err.getResponse();
    console.error(err);
    const body: ApiError = {
      error: { code: 'INTERNAL', message: 'Interner Serverfehler.' },
    };
    return c.json(body, 500);
  });

  return app;
}
