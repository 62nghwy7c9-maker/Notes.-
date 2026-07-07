import type { Hono } from 'hono';
import type { HealthResponse } from '@notes/shared';
import type { AppDeps } from '../app.js';
import { APP_VERSION } from '../app.js';
import { getSetting } from '../services/settingsService.js';

/** `GET /api/health` – Statusprüfung für Bootstrap/Monitoring (M0-DoD). */
export function registerHealthRoute(api: Hono, { db, env }: AppDeps): void {
  api.get('/health', (c) => {
    const aiEnabled =
      getSetting(db, 'ai_enabled') === 'true' || Boolean(env.ANTHROPIC_API_KEY);

    const body: HealthResponse = {
      status: 'ok',
      version: APP_VERSION,
      aiEnabled,
      time: Date.now(),
    };
    return c.json(body);
  });
}
