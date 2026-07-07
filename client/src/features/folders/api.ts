import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateFolderRequest, UpdateFolderRequest } from '@notes/shared';
import { folderResponseSchema, folderTreeResponseSchema } from '@notes/shared';
import { apiJson, apiVoid } from '../../shared/api/http.js';

export function useFolderTree() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: () => apiJson('/folders/tree', folderTreeResponseSchema),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['folders'] });
    void qc.invalidateQueries({ queryKey: ['notes'] });
    void qc.invalidateQueries({ queryKey: ['note'] });
    void qc.invalidateQueries({ queryKey: ['trash'] });
  };
}

export function useCreateFolder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateFolderRequest) =>
      apiJson('/folders', folderResponseSchema, { method: 'POST', json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateFolder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateFolderRequest & { id: string }) =>
      apiJson(`/folders/${id}`, folderResponseSchema, { method: 'PATCH', json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, strategy }: { id: string; strategy: 'cascade' | 'lift' }) =>
      apiVoid(`/folders/${id}?strategy=${strategy}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
