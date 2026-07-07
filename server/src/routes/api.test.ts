import { beforeEach, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';
import {
  apiErrorSchema,
  folderResponseSchema,
  folderTreeResponseSchema,
  noteResponseSchema,
  notesListResponseSchema,
  searchResponseSchema,
  trashListResponseSchema,
} from '@notes/shared';
import { createApp } from '../app.js';
import { openInMemory } from '../db/client.js';
import { loadEnv } from '../env.js';

let app: Hono;
beforeEach(() => {
  app = createApp({ db: openInMemory().db, env: loadEnv({}) });
});

const json = (body: unknown) => ({
  method: 'POST' as string,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('API-Verträge (Zod-Schemas aus shared/)', () => {
  it('Ordner: POST → PATCH → tree → DELETE', async () => {
    const created = await app.request('/api/folders', json({ name: 'Projekte', icon: '🚀' }));
    expect(created.status).toBe(201);
    const folder = folderResponseSchema.parse(await created.json());

    const patched = await app.request(`/api/folders/${folder.id}`, {
      ...json({ name: 'Projekte 2' }),
      method: 'PATCH',
    });
    expect(folderResponseSchema.parse(await patched.json()).name).toBe('Projekte 2');

    const tree = await app.request('/api/folders/tree');
    const parsed = folderTreeResponseSchema.parse(await tree.json());
    expect(parsed.tree).toHaveLength(1);

    const del = await app.request(`/api/folders/${folder.id}?strategy=lift`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(204);
  });

  it('Notizen: POST → PUT → GET → Liste → Papierkorb-Flow', async () => {
    const created = await app.request('/api/notes', json({ title: 'Test' }));
    expect(created.status).toBe(201);
    const note = noteResponseSchema.parse(await created.json());

    const put = await app.request(`/api/notes/${note.id}`, {
      ...json({ title: 'Test', content: 'Inhalt' }),
      method: 'PUT',
    });
    expect(noteResponseSchema.parse(await put.json()).content).toBe('Inhalt');

    const list = await app.request('/api/notes?folderId=inbox');
    expect(notesListResponseSchema.parse(await list.json()).notes).toHaveLength(1);

    const del = await app.request(`/api/notes/${note.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);

    const trash = await app.request('/api/notes/trash');
    expect(trashListResponseSchema.parse(await trash.json()).notes).toHaveLength(1);

    const restored = await app.request(`/api/notes/${note.id}/restore`, { method: 'POST' });
    expect(noteResponseSchema.parse(await restored.json()).id).toBe(note.id);
  });

  it('Suche liefert vertragskonforme Treffer', async () => {
    await app.request('/api/notes', json({ title: 'Hochbeet', content: 'Frühjahr' }));
    const res = await app.request('/api/search?q=hochbeet');
    const parsed = searchResponseSchema.parse(await res.json());
    expect(parsed.results[0]!.title).toBe('Hochbeet');
  });

  it('Fehlerformat: 404 und 400 folgen dem Vertrag', async () => {
    const missing = await app.request('/api/notes/gibtsnicht');
    expect(missing.status).toBe(404);
    expect(apiErrorSchema.parse(await missing.json()).error.code).toBe('NOT_FOUND');

    const invalid = await app.request('/api/folders', json({ name: '' }));
    expect(invalid.status).toBe(400);
    expect(apiErrorSchema.parse(await invalid.json()).error.code).toBe('VALIDATION');
  });

  it('Export liefert ein ZIP', async () => {
    await app.request('/api/notes', json({ title: 'Export mich' }));
    const res = await app.request('/api/export');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    const buf = new Uint8Array(await res.arrayBuffer());
    // ZIP-Magic "PK"
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});
