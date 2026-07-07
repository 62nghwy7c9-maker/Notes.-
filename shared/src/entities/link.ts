import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

/** Beziehungstyp zwischen zwei Notizen (F-20). */
export const linkTypeSchema = z.enum([
  'related',
  'builds_on',
  'contradicts',
  'reference',
  'part_of',
]);
export type LinkType = z.infer<typeof linkTypeSchema>;

/** Herkunft einer Verknüpfung. */
export const linkOriginSchema = z.enum(['manual', 'ai', 'wikilink']);
export type LinkOrigin = z.infer<typeof linkOriginSchema>;

/** Gerichtete Verknüpfung; Anzeige/Duplikat-Check behandeln (A,B)=(B,A). */
export const linkSchema = z.object({
  id: idSchema,
  sourceId: idSchema,
  targetId: idSchema,
  type: linkTypeSchema,
  reason: z.string().max(200).nullable(),
  origin: linkOriginSchema,
  createdAt: timestampSchema,
});
export type Link = z.infer<typeof linkSchema>;
