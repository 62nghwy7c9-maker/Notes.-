import { z } from 'zod';
import { idSchema, timestampSchema } from './common.js';

/** Ordner: beliebig tief verschachtelbar über `parentId` (F-02). */
export const folderSchema = z.object({
  id: idSchema,
  parentId: idSchema.nullable(),
  name: z.string().min(1).max(120),
  icon: z.string().max(8).nullable(),
  description: z.string().max(500).nullable(),
  position: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Folder = z.infer<typeof folderSchema>;

/** Ordner-Knoten im Baum inkl. Notizzählern und Kindern (GET /folders/tree). */
export type FolderTreeNode = Omit<Folder, 'createdAt' | 'updatedAt'> & {
  noteCount: number;
  totalNoteCount: number;
  children: FolderTreeNode[];
};

export const folderTreeNodeSchema: z.ZodType<FolderTreeNode> = z.lazy(() =>
  folderSchema
    .omit({ createdAt: true, updatedAt: true })
    .extend({
      noteCount: z.number().int().nonnegative(),
      totalNoteCount: z.number().int().nonnegative(),
      children: z.array(folderTreeNodeSchema),
    }),
);
