import { z } from 'zod';
import { idSchema, timestampSchema } from '../entities/common.js';
import { noteSummarySchema, noteWithTagsSchema } from '../entities/note.js';

/** GET /notes?folderId=…|inbox&includeDescendants=true */
export const listNotesQuerySchema = z.object({
  folderId: z.union([z.literal('inbox'), idSchema]),
  includeDescendants: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

export const notesListResponseSchema = z.object({
  notes: z.array(noteSummarySchema),
});
export type NotesListResponse = z.infer<typeof notesListResponseSchema>;

/** POST /notes */
export const createNoteRequestSchema = z.object({
  folderId: idSchema.nullish(),
  title: z.string().max(300).optional(),
  content: z.string().optional(),
});
export type CreateNoteRequest = z.infer<typeof createNoteRequestSchema>;

/** PUT /notes/:id – Autosave (idempotent, last-write-wins) */
export const putNoteRequestSchema = z.object({
  title: z.string().max(300),
  content: z.string(),
});
export type PutNoteRequest = z.infer<typeof putNoteRequestSchema>;

/** PATCH /notes/:id – Metadaten */
export const patchNoteRequestSchema = z.object({
  folderId: idSchema.nullable().optional(), // null = Eingang
  pinned: z.boolean().optional(),
});
export type PatchNoteRequest = z.infer<typeof patchNoteRequestSchema>;

export const noteResponseSchema = noteWithTagsSchema;

/** GET /notes/trash */
export const trashedNoteSchema = z.object({
  id: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  deletedAt: timestampSchema,
});
export type TrashedNote = z.infer<typeof trashedNoteSchema>;

export const trashListResponseSchema = z.object({
  notes: z.array(trashedNoteSchema),
});
export type TrashListResponse = z.infer<typeof trashListResponseSchema>;
