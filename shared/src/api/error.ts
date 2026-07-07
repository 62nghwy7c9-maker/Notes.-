import { z } from 'zod';

/** Einheitliche Fehler-Codes der API (siehe 05-api-spezifikation.md). */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION', // 400
  'NOT_FOUND', // 404
  'CONFLICT', // 409 (Ordner-Zyklus, Namenskollision)
  'AI_DISABLED', // 409
  'AI_UPSTREAM', // 502
  'INTERNAL', // 500
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Fehler-Body: `{ "error": { "code", "message" } }`. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** HTTP-Status je Fehler-Code. */
export const errorStatusByCode: Record<ApiErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  AI_DISABLED: 409,
  AI_UPSTREAM: 502,
  INTERNAL: 500,
};
