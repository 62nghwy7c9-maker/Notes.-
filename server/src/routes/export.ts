import type { Hono } from 'hono';
import type { AppDeps } from '../app.js';
import { exportAllAsZip } from '../services/exportService.js';

export function registerExportRoute(api: Hono, { db }: AppDeps): void {
  api.get('/export', (c) => {
    const zip = exportAllAsZip(db);
    c.header('Content-Type', 'application/zip');
    c.header('Content-Disposition', 'attachment; filename="notizen-export.zip"');
    return c.body(zip.buffer as ArrayBuffer);
  });
}
