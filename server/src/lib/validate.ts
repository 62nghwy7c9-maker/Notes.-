import type { z } from 'zod';
import { ServiceError } from './errors.js';

/** Zod-Parse mit Übersetzung in einen 400-VALIDATION-Fehler. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join('.') || 'Eingabe';
    throw new ServiceError('VALIDATION', `Ungültige Eingabe: ${path} – ${first?.message ?? ''}`);
  }
  return result.data;
}
