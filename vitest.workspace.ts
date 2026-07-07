import { defineWorkspace } from 'vitest/config';

// Bündelt die Test-Konfigurationen der Workspaces, damit `npm test`
// (vitest run) Server- und Client-Tests in einem Lauf ausführt.
export default defineWorkspace([
  './server/vitest.config.ts',
  './client/vitest.config.ts',
]);
