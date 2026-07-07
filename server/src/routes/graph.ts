import type { Hono } from 'hono';
import type { AppDeps } from '../app.js';
import { getGraph, listTags } from '../services/graphService.js';

export function registerGraphRoutes(api: Hono, { db }: AppDeps): void {
  api.get('/graph', (c) => {
    const folderId = c.req.query('folderId') || undefined;
    const tag = c.req.query('tag') || undefined;
    return c.json(getGraph(db, { folderId, tag }));
  });

  api.get('/tags', (c) => c.json({ tags: listTags(db) }));
}
