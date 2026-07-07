import { z } from 'zod';

/** Antwort von `GET /api/health`. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  aiEnabled: z.boolean(),
  time: z.number().int().nonnegative(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
