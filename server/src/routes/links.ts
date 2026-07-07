import type { Hono } from 'hono';
import { createLinkRequestSchema, patchLinkRequestSchema } from '@notes/shared';
import type { AppDeps } from '../app.js';
import { parseOrThrow } from '../lib/validate.js';
import {
  createLink,
  deleteLink,
  listLinksForNote,
  patchLink,
} from '../services/linkService.js';

export function registerLinkRoutes(api: Hono, { db }: AppDeps): void {
  api.get('/notes/:id/links', (c) =>
    c.json({ links: listLinksForNote(db, c.req.param('id')) }),
  );

  api.post('/links', async (c) => {
    const input = parseOrThrow(createLinkRequestSchema, await c.req.json());
    return c.json(createLink(db, input), 201);
  });

  api.patch('/links/:id', async (c) => {
    const input = parseOrThrow(patchLinkRequestSchema, await c.req.json());
    return c.json(patchLink(db, c.req.param('id'), input));
  });

  api.delete('/links/:id', (c) => {
    deleteLink(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
