import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLinkRequest } from '@notes/shared';
import { linkResponseSchema, noteLinksResponseSchema } from '@notes/shared';
import { apiJson, apiVoid } from '../../shared/api/http.js';

export function useNoteLinks(noteId: string | null) {
  return useQuery({
    queryKey: ['links', noteId],
    enabled: noteId !== null,
    queryFn: () => apiJson(`/notes/${noteId}/links`, noteLinksResponseSchema),
  });
}

function useInvalidateLinks() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['links'] });
    void qc.invalidateQueries({ queryKey: ['graph'] });
  };
}

export function useCreateLink() {
  const invalidate = useInvalidateLinks();
  return useMutation({
    mutationFn: (input: CreateLinkRequest) =>
      apiJson('/links', linkResponseSchema, { method: 'POST', json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteLink() {
  const invalidate = useInvalidateLinks();
  return useMutation({
    mutationFn: (id: string) => apiVoid(`/links/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
