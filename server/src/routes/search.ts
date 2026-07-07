import type { Hono } from 'hono';
import { searchQuerySchema } from '@notes/shared';
import type { AppDeps } from '../app.js';
import { parseOrThrow } from '../lib/validate.js';
import { searchNotes } from '../services/searchService.js';

export function registerSearchRoute(api: Hono, { db }: AppDeps): void {
  api.get('/search', (c) => {
    const { q } = parseOrThrow(searchQuerySchema, c.req.query());
    return c.json({ results: searchNotes(db, q) });
  });
}
