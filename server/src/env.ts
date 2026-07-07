import { z } from 'zod';

/**
 * Geparste Umgebungsvariablen (siehe .env.example / 08-projektstruktur.md).
 * Wird einmal beim Bootstrap gelesen; nur der Server liest diese Werte.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATA_DIR: z.string().default('./data'),
  ANTHROPIC_API_KEY: z.string().optional(),
  SETTINGS_SECRET: z.string().optional(),
  AI_MODEL_DEFAULT: z.string().default('claude-sonnet-5'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
