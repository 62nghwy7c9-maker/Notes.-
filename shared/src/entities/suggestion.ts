import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';
import { linkTypeSchema } from './link.js';

/** Art eines KI-Vorschlags (F-30/31/33/34). */
export const suggestionKindSchema = z.enum([
  'move_to_folder',
  'create_folder',
  'link',
  'tags',
]);
export type SuggestionKind = z.infer<typeof suggestionKindSchema>;

export const suggestionStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'expired',
  'auto_applied',
]);
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;

/** JSON-Payload je `kind` (siehe 04-datenmodell.md). */
export const suggestionPayloadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('move_to_folder'),
    folderId: idSchema,
    folderPath: z.string(),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('create_folder'),
    name: z.string(),
    parentId: idSchema.nullable(),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('link'),
    targetNoteId: idSchema,
    type: linkTypeSchema,
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('tags'),
    tags: z.array(z.string()),
    summary: z.string(),
  }),
]);
export type SuggestionPayload = z.infer<typeof suggestionPayloadSchema>;

export const suggestionSchema = z.object({
  id: idSchema,
  noteId: idSchema,
  kind: suggestionKindSchema,
  payload: suggestionPayloadSchema,
  confidence: z.number().min(0).max(1),
  status: suggestionStatusSchema,
  createdAt: timestampSchema,
  resolvedAt: timestampSchema.nullable(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;
