-- Migration 0001: Grundschema der Notizen-App (siehe 04-datenmodell.md).
-- FTS5-Tabelle + Trigger und das Standard-Settings-Seed sind hier von Hand
-- gepflegt, da Drizzle-Kit diese nicht abbilden kann.

-- Ordner: beliebig tiefe Verschachtelung über Selbstreferenz (F-02)
CREATE TABLE folders (
    id          TEXT PRIMARY KEY,
    parent_id   TEXT REFERENCES folders(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    icon        TEXT,
    description TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    UNIQUE (parent_id, name)
);
CREATE INDEX idx_folders_parent ON folders(parent_id);

-- Notizen
CREATE TABLE notes (
    id           TEXT PRIMARY KEY,
    folder_id    TEXT REFERENCES folders(id) ON DELETE SET NULL,
    title        TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL DEFAULT '',
    summary      TEXT,
    pinned       INTEGER NOT NULL DEFAULT 0,
    organized_at INTEGER,
    deleted_at   INTEGER,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_notes_folder ON notes(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_deleted ON notes(deleted_at) WHERE deleted_at IS NOT NULL;

-- Volltextsuche (F-13): externer Content-Table-Modus, per Trigger synchron
CREATE VIRTUAL TABLE notes_fts USING fts5(
    title, content,
    content='notes', content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
);

-- FTS-Trigger: gelöschte Notizen (deleted_at gesetzt) bleiben aus dem Index.
CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes WHEN new.deleted_at IS NULL BEGIN
    INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content)
        VALUES ('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER notes_fts_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content)
        VALUES ('delete', old.rowid, old.title, old.content);
    INSERT INTO notes_fts(rowid, title, content)
        SELECT new.rowid, new.title, new.content WHERE new.deleted_at IS NULL;
END;

-- Verknüpfungen zwischen Notizen (F-20)
CREATE TABLE links (
    id          TEXT PRIMARY KEY,
    source_id   TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_id   TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'related'
                CHECK (type IN ('related','builds_on','contradicts','reference','part_of')),
    reason      TEXT,
    origin      TEXT NOT NULL DEFAULT 'manual'
                CHECK (origin IN ('manual','ai','wikilink')),
    created_at  INTEGER NOT NULL,
    CHECK (source_id <> target_id),
    UNIQUE (source_id, target_id, type)
);
CREATE INDEX idx_links_source ON links(source_id);
CREATE INDEX idx_links_target ON links(target_id);

-- Tags (F-32)
CREATE TABLE tags (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE
);
CREATE TABLE note_tags (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    origin  TEXT NOT NULL DEFAULT 'ai' CHECK (origin IN ('manual','ai')),
    PRIMARY KEY (note_id, tag_id)
);

-- KI-Vorschläge: Inbox + Ablehnungsgedächtnis (F-30/31/33/34)
CREATE TABLE ai_suggestions (
    id          TEXT PRIMARY KEY,
    note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('move_to_folder','create_folder','link','tags')),
    payload     TEXT NOT NULL,
    confidence  REAL NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected','expired','auto_applied')),
    created_at  INTEGER NOT NULL,
    resolved_at INTEGER
);
CREATE INDEX idx_suggestions_status ON ai_suggestions(status, created_at);
CREATE INDEX idx_suggestions_note ON ai_suggestions(note_id);

-- Kreativ-Agent (F-40)
CREATE TABLE chat_sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT 'Neue Unterhaltung',
    context     TEXT NOT NULL DEFAULT '{"scope":"all"}',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);
CREATE TABLE chat_messages (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content       TEXT NOT NULL,
    tool_activity TEXT,
    created_at    INTEGER NOT NULL
);
CREATE INDEX idx_messages_session ON chat_messages(session_id, created_at);

-- Key-Value-Einstellungen (F-50)
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Standard-Einstellungen
INSERT INTO settings (key, value) VALUES
    ('theme', 'system'),
    ('ai_enabled', 'false'),
    ('auto_apply_threshold', '0.85'),
    ('ai_language', 'de');
