import { z } from 'zod';
import { idSchema } from '../entities/common.js';

/** GET /search?q=… → 200 (FTS5, max. 50 Treffer) */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  noteId: idSchema,
  title: z.string(),
  snippet: z.string(), // Treffer mit <b>…</b>-Hervorhebung
  folderPath: z.string(), // z. B. "Projekte/Garten"; "" = Eingang
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z.object({
  results: z.array(searchResultSchema),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;
