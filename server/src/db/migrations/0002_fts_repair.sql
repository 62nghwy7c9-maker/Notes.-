-- Migration 0002: FTS5-Trigger reparieren + Index neu aufbauen.
-- DBs, die mit der ursprünglichen Trigger-Fassung liefen, können einen
-- korrupten FTS-Index haben (delete-Befehle für nicht indizierte Zeilen,
-- SQLITE_CORRUPT_VTAB). Trigger neu anlegen und Index aus `notes` neu
-- aufbauen; für frisch migrierte DBs ist das ein No-op.

DROP TRIGGER IF EXISTS notes_fts_ai;
DROP TRIGGER IF EXISTS notes_fts_ad;
DROP TRIGGER IF EXISTS notes_fts_au;
DROP TRIGGER IF EXISTS notes_fts_au_del;
DROP TRIGGER IF EXISTS notes_fts_au_ins;

CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes WHEN new.deleted_at IS NULL BEGIN
    INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes WHEN old.deleted_at IS NULL BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content)
        VALUES ('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER notes_fts_au_del AFTER UPDATE ON notes WHEN old.deleted_at IS NULL BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content)
        VALUES ('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER notes_fts_au_ins AFTER UPDATE ON notes WHEN new.deleted_at IS NULL BEGIN
    INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;

-- Index vollständig aus der Content-Tabelle neu aufbauen …
INSERT INTO notes_fts(notes_fts) VALUES('rebuild');

-- … und Papierkorb-Notizen wieder daraus entfernen (rebuild indiziert alle).
INSERT INTO notes_fts(notes_fts, rowid, title, content)
    SELECT 'delete', rowid, title, content FROM notes WHERE deleted_at IS NOT NULL;
