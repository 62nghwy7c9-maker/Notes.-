import type { Hono } from 'hono';
import {
  createFolderRequestSchema,
  deleteFolderQuerySchema,
  updateFolderRequestSchema,
} from '@notes/shared';
import type { AppDeps } from '../app.js';
import { parseOrThrow } from '../lib/validate.js';
import {
  createFolder,
  deleteFolder,
  getFolderTree,
  updateFolder,
} from '../services/folderService.js';

export function registerFolderRoutes(api: Hono, { db }: AppDeps): void {
  api.get('/folders/tree', (c) => c.json({ tree: getFolderTree(db) }));

  api.post('/folders', async (c) => {
    const input = parseOrThrow(createFolderRequestSchema, await c.req.json());
    return c.json(createFolder(db, input), 201);
  });

  api.patch('/folders/:id', async (c) => {
    const input = parseOrThrow(updateFolderRequestSchema, await c.req.json());
    return c.json(updateFolder(db, c.req.param('id'), input));
  });

  api.delete('/folders/:id', (c) => {
    const { strategy } = parseOrThrow(deleteFolderQuerySchema, c.req.query());
    deleteFolder(db, c.req.param('id'), strategy);
    return c.body(null, 204);
  });
}
