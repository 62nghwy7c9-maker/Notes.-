import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

/** Notiz (Inhalt als Markdown). */
export const noteSchema = z.object({
  id: idSchema,
  folderId: idSchema.nullable(), // null = „Eingang"
  title: z.string().default(''),
  content: z.string().default(''),
  summary: z.string().nullable(), // KI-Zusammenfassung, 1 Satz (F-32)
  pinned: z.boolean(),
  organizedAt: timestampSchema.nullable(),
  deletedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Note = z.infer<typeof noteSchema>;

/** Notiz mit aufgelösten Tags (GET /notes/:id). */
export const noteWithTagsSchema = noteSchema
  .omit({ deletedAt: true })
  .extend({ tags: z.array(z.string()) });
export type NoteWithTags = z.infer<typeof noteWithTagsSchema>;

/** Kompakte Notiz für Listen/Karten. */
export const noteSummarySchema = z.object({
  id: idSchema,
  folderId: idSchema.nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  pinned: z.boolean(),
  tags: z.array(z.string()),
  updatedAt: timestampSchema,
});
export type NoteSummary = z.infer<typeof noteSummarySchema>;
