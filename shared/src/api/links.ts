import { z } from 'zod';
import { idSchema } from '../entities/common.js';
import { linkOriginSchema, linkSchema, linkTypeSchema } from '../entities/link.js';

/** POST /links */
export const createLinkRequestSchema = z.object({
  sourceId: idSchema,
  targetId: idSchema,
  type: linkTypeSchema.default('related'),
  reason: z.string().max(200).nullish(),
});
export type CreateLinkRequest = z.infer<typeof createLinkRequestSchema>;

/** PATCH /links/:id */
export const patchLinkRequestSchema = z.object({
  type: linkTypeSchema.optional(),
  reason: z.string().max(200).nullable().optional(),
});
export type PatchLinkRequest = z.infer<typeof patchLinkRequestSchema>;

export const linkResponseSchema = linkSchema;

/** GET /notes/:id/links – beide Richtungen aufgelöst */
export const noteLinkSchema = z.object({
  id: idSchema,
  direction: z.enum(['outgoing', 'incoming']),
  type: linkTypeSchema,
  reason: z.string().nullable(),
  origin: linkOriginSchema,
  otherNote: z.object({
    id: idSchema,
    title: z.string(),
    summary: z.string().nullable(),
  }),
});
export type NoteLink = z.infer<typeof noteLinkSchema>;

export const noteLinksResponseSchema = z.object({
  links: z.array(noteLinkSchema),
});
export type NoteLinksResponse = z.infer<typeof noteLinksResponseSchema>;
