import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@notes/shared';
import { createApp } from '../app.js';
import { openInMemory } from '../db/client.js';
import { loadEnv } from '../env.js';

function testApp(envOverrides: NodeJS.ProcessEnv = {}) {
  const { db } = openInMemory();
  const env = loadEnv({ ...envOverrides });
  return createApp({ db, env });
}

describe('GET /api/health', () => {
  it('antwortet mit einem gültigen HealthResponse', async () => {
    const res = await testApp().request('/api/health');
    expect(res.status).toBe(200);
    const parsed = healthResponseSchema.parse(await res.json());
    expect(parsed.status).toBe('ok');
    expect(parsed.aiEnabled).toBe(false);
  });

  it('meldet aiEnabled=true, wenn ein API-Key gesetzt ist', async () => {
    const res = await testApp({ ANTHROPIC_API_KEY: 'sk-test' }).request(
      '/api/health',
    );
    const parsed = healthResponseSchema.parse(await res.json());
    expect(parsed.aiEnabled).toBe(true);
  });
});
