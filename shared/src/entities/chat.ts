import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

/** Fokus/Kontext einer Chat-Session (F-45). */
export const chatContextSchema = z.union([
  z.object({ scope: z.literal('all') }),
  z.object({ scope: z.literal('folder'), folderId: idSchema }),
  z.object({ scope: z.literal('note'), noteId: idSchema }),
]);
export type ChatContext = z.infer<typeof chatContextSchema>;

export const chatSessionSchema = z.object({
  id: idSchema,
  title: z.string(),
  context: chatContextSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ChatSession = z.infer<typeof chatSessionSchema>;

/** Ein einzelner Tool-Aufruf des Agenten (Anzeige „hat 3 Notizen gelesen"). */
export const toolActivitySchema = z.object({
  tool: z.string(),
  summary: z.string(),
});
export type ToolActivity = z.infer<typeof toolActivitySchema>;

export const chatMessageSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  toolActivity: z.array(toolActivitySchema).nullable(),
  createdAt: timestampSchema,
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
