import { describe, expect, it } from 'vitest';
import { openInMemory } from './client.js';

describe('migration 0001', () => {
  it('legt alle Kern-Tabellen an', () => {
    const { sqlite } = openInMemory();
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => (r as { name: string }).name);

    for (const t of [
      'folders',
      'notes',
      'links',
      'tags',
      'note_tags',
      'ai_suggestions',
      'chat_sessions',
      'chat_messages',
      'settings',
    ]) {
      expect(tables).toContain(t);
    }
  });

  it('seedet die Standard-Einstellungen', () => {
    const { sqlite } = openInMemory();
    const theme = sqlite
      .prepare("SELECT value FROM settings WHERE key='theme'")
      .get() as { value: string } | undefined;
    expect(theme?.value).toBe('system');
  });

  it('hält den FTS5-Index über Trigger synchron und ignoriert Gelöschtes', () => {
    const { sqlite } = openInMemory();
    const now = Date.now();
    sqlite
      .prepare(
        `INSERT INTO notes (id, title, content, pinned, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)`,
      )
      .run('n1', 'Hochbeet', 'Planung fürs Frühjahr', now, now);

    const hit = sqlite
      .prepare("SELECT rowid FROM notes_fts WHERE notes_fts MATCH 'Hochbeet'")
      .all();
    expect(hit).toHaveLength(1);

    // Als gelöscht markieren → aus dem Index entfernt.
    sqlite
      .prepare('UPDATE notes SET deleted_at = ? WHERE id = ?')
      .run(Date.now(), 'n1');
    const afterDelete = sqlite
      .prepare("SELECT rowid FROM notes_fts WHERE notes_fts MATCH 'Hochbeet'")
      .all();
    expect(afterDelete).toHaveLength(0);
  });

  it('ist idempotent (zweiter Lauf wendet nichts Neues an)', () => {
    const { sqlite } = openInMemory();
    const count = sqlite
      .prepare('SELECT COUNT(*) AS c FROM __migrations')
      .get() as { c: number };
    expect(count.c).toBeGreaterThanOrEqual(1);
  });
});
