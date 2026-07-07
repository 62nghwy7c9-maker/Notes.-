import { z } from 'zod';
import { idSchema } from '../entities/common.js';
import { folderSchema, folderTreeNodeSchema } from '../entities/folder.js';

/** GET /folders/tree → 200 */
export const folderTreeResponseSchema = z.object({
  tree: z.array(folderTreeNodeSchema),
});
export type FolderTreeResponse = z.infer<typeof folderTreeResponseSchema>;

/** POST /folders */
export const createFolderRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: idSchema.nullish(),
  icon: z.string().max(8).nullish(),
  description: z.string().max(500).nullish(),
});
export type CreateFolderRequest = z.infer<typeof createFolderRequestSchema>;

/** PATCH /folders/:id – Umbenennen, Icon/Beschreibung, Verschieben, Umsortieren */
export const updateFolderRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  icon: z.string().max(8).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: idSchema.nullable().optional(), // null = an die Wurzel
  position: z.number().int().nonnegative().optional(),
});
export type UpdateFolderRequest = z.infer<typeof updateFolderRequestSchema>;

/** DELETE /folders/:id?strategy=cascade|lift (F-04) */
export const deleteFolderQuerySchema = z.object({
  strategy: z.enum(['cascade', 'lift']),
});
export type DeleteFolderQuery = z.infer<typeof deleteFolderQuerySchema>;

export const folderResponseSchema = folderSchema;
