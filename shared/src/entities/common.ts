import { z } from 'zod';

/** UUIDv7-String (zeitlich sortierbar). */
export const idSchema = z.string().min(1);

/** Unix-Zeitstempel in Millisekunden. */
export const timestampSchema = z.number().int().nonnegative();

/** Herkunft eines abgeleiteten Datensatzes (Verknüpfung, Tag, …). */
export const originSchema = z.enum(['manual', 'ai', 'wikilink']);
export type Origin = z.infer<typeof originSchema>;
