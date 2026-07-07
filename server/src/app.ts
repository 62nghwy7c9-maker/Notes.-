import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiError, ApiErrorCode } from '@notes/shared';
import { errorStatusByCode } from '@notes/shared';
import type { Db } from './db/client.js';
import type { Env } from './env.js';
import { registerHealthRoute } from './routes/health.js';

export const APP_VERSION = '0.1.0';

export interface AppDeps {
  db: Db;
  env: Env;
}

/** Wirft einen typisierten API-Fehler (wird zentral in ein JSON-Body übersetzt). */
export function apiError(code: ApiErrorCode, message: string): HTTPException {
  const body: ApiError = { error: { code, message } };
  return new HTTPException(errorStatusByCode[code] as never, {
    res: Response.json(body, { status: errorStatusByCode[code] }),
  });
}

/** Baut die Hono-App mit allen Routen unter `/api`. */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const api = new Hono();

  registerHealthRoute(api, deps);

  app.route('/api', api);

  app.onError((err, c) => {
    if (err instanceof HTTPException && err.res) return err.res;
    const body: ApiError = {
      error: { code: 'INTERNAL', message: 'Interner Serverfehler.' },
    };
    console.error(err);
    return c.json(body, 500);
  });

  return app;
}
