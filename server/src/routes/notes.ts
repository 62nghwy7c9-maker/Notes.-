import type { Hono } from 'hono';
import {
  createNoteRequestSchema,
  listNotesQuerySchema,
  patchNoteRequestSchema,
  putNoteRequestSchema,
} from '@notes/shared';
import type { AppDeps } from '../app.js';
import { parseOrThrow } from '../lib/validate.js';
import {
  createNote,
  getNote,
  hardDeleteNote,
  listNotes,
  listTrash,
  patchNote,
  putNote,
  restoreNote,
  trashNote,
} from '../services/noteService.js';

export function registerNoteRoutes(api: Hono, { db }: AppDeps): void {
  api.get('/notes', (c) => {
    const q = parseOrThrow(listNotesQuerySchema, c.req.query());
    return c.json({ notes: listNotes(db, q.folderId, q.includeDescendants) });
  });

  // Vor '/notes/:id' registrieren, sonst fängt ':id' den Pfad 'trash' ab.
  api.get('/notes/trash', (c) => c.json({ notes: listTrash(db) }));

  api.get('/notes/:id', (c) => c.json(getNote(db, c.req.param('id'))));

  api.post('/notes', async (c) => {
    const input = parseOrThrow(createNoteRequestSchema, await c.req.json());
    return c.json(createNote(db, input), 201);
  });

  api.put('/notes/:id', async (c) => {
    const input = parseOrThrow(putNoteRequestSchema, await c.req.json());
    return c.json(putNote(db, c.req.param('id'), input));
  });

  api.patch('/notes/:id', async (c) => {
    const input = parseOrThrow(patchNoteRequestSchema, await c.req.json());
    return c.json(patchNote(db, c.req.param('id'), input));
  });

  api.delete('/notes/:id', (c) => {
    trashNote(db, c.req.param('id'));
    return c.body(null, 204);
  });

  api.post('/notes/:id/restore', (c) => c.json(restoreNote(db, c.req.param('id'))));

  api.delete('/notes/:id/hard', (c) => {
    hardDeleteNote(db, c.req.param('id'));
    return c.body(null, 204);
  });
}
