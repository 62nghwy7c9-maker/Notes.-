import { z } from 'zod';
import { idSchema } from '../entities/common.js';
import { linkTypeSchema } from '../entities/link.js';

/** GET /graph?folderId=…&tag=… → 200 (F-22/23) */
export const graphNodeSchema = z.object({
  id: idSchema,
  title: z.string(),
  folderRootId: idSchema.nullable(), // null = Eingang
  linkCount: z.number().int().nonnegative(),
});
export type GraphNode = z.infer<typeof graphNodeSchema>;

export const graphEdgeSchema = z.object({
  id: idSchema,
  source: idSchema,
  target: idSchema,
  type: linkTypeSchema,
});
export type GraphEdge = z.infer<typeof graphEdgeSchema>;

export const graphResponseSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});
export type GraphResponse = z.infer<typeof graphResponseSchema>;

/** GET /tags → 200 (für den Tag-Filter der Graph-Ansicht) */
export const tagsResponseSchema = z.object({
  tags: z.array(z.string()),
});
export type TagsResponse = z.infer<typeof tagsResponseSchema>;
