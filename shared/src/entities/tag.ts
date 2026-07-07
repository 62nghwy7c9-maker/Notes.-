import { z } from 'zod';
import { idSchema } from './common.js';

/** Tag; Name normalisiert (lowercase, getrimmt). */
export const tagSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(60),
});
export type Tag = z.infer<typeof tagSchema>;

/** Zuordnung Notiz ↔ Tag. */
export const noteTagSchema = z.object({
  noteId: idSchema,
  tagId: idSchema,
  origin: z.enum(['manual', 'ai']),
});
export type NoteTag = z.infer<typeof noteTagSchema>;
