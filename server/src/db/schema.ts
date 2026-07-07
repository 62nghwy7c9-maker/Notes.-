import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

// Drizzle-Schema als Single Source of Truth für typsichere Queries.
// Die tatsächliche DDL (inkl. FTS5-Tabelle + Trigger) liegt in
// src/db/migrations/ — siehe 04-datenmodell.md.

export const folders = sqliteTable(
  'folders',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id'),
    name: text('name').notNull(),
    icon: text('icon'),
    description: text('description'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('idx_folders_parent').on(t.parentId),
    unique('uq_folders_parent_name').on(t.parentId, t.name),
  ],
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id'),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    summary: text('summary'),
    pinned: integer('pinned').notNull().default(0),
    organizedAt: integer('organized_at'),
    deletedAt: integer('deleted_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('idx_notes_folder')
      .on(t.folderId)
      .where(sql`deleted_at IS NULL`),
    index('idx_notes_deleted')
      .on(t.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ],
);

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    targetId: text('target_id').notNull(),
    type: text('type').notNull().default('related'),
    reason: text('reason'),
    origin: text('origin').notNull().default('manual'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('idx_links_source').on(t.sourceId),
    index('idx_links_target').on(t.targetId),
    unique('uq_links_pair_type').on(t.sourceId, t.targetId, t.type),
  ],
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const noteTags = sqliteTable(
  'note_tags',
  {
    noteId: text('note_id').notNull(),
    tagId: text('tag_id').notNull(),
    origin: text('origin').notNull().default('ai'),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tagId] })],
);

export const aiSuggestions = sqliteTable(
  'ai_suggestions',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id').notNull(),
    kind: text('kind').notNull(),
    payload: text('payload').notNull(),
    confidence: real('confidence').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: integer('created_at').notNull(),
    resolvedAt: integer('resolved_at'),
  },
  (t) => [
    index('idx_suggestions_status').on(t.status, t.createdAt),
    index('idx_suggestions_note').on(t.noteId),
  ],
);

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('Neue Unterhaltung'),
  context: text('context').notNull().default('{"scope":"all"}'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    toolActivity: text('tool_activity'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('idx_messages_session').on(t.sessionId, t.createdAt)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
