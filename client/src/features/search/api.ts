import { useQuery } from '@tanstack/react-query';
import { searchResponseSchema } from '@notes/shared';
import { apiJson } from '../../shared/api/http.js';

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q],
    enabled: q.length > 0,
    staleTime: 5_000,
    queryFn: () => apiJson(`/search?q=${encodeURIComponent(q)}`, searchResponseSchema),
  });
}
