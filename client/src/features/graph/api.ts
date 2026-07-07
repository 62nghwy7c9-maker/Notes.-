import { useQuery } from '@tanstack/react-query';
import { graphResponseSchema, tagsResponseSchema } from '@notes/shared';
import { apiJson } from '../../shared/api/http.js';

export function useGraph(filter: { folderId?: string; tag?: string }) {
  const params = new URLSearchParams();
  if (filter.folderId) params.set('folderId', filter.folderId);
  if (filter.tag) params.set('tag', filter.tag);
  const qs = params.toString();
  return useQuery({
    queryKey: ['graph', filter.folderId ?? null, filter.tag ?? null],
    queryFn: () => apiJson(`/graph${qs ? `?${qs}` : ''}`, graphResponseSchema),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiJson('/tags', tagsResponseSchema),
  });
}
