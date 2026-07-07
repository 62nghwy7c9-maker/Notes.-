import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateNoteRequest,
  PatchNoteRequest,
  PutNoteRequest,
} from '@notes/shared';
import {
  noteResponseSchema,
  notesListResponseSchema,
  trashListResponseSchema,
} from '@notes/shared';
import { apiJson, apiVoid } from '../../shared/api/http.js';

export function useNotes(folderId: string | 'inbox') {
  return useQuery({
    queryKey: ['notes', folderId],
    queryFn: () =>
      apiJson(`/notes?folderId=${encodeURIComponent(folderId)}`, notesListResponseSchema),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ['note', id],
    enabled: id !== null,
    queryFn: () => apiJson(`/notes/${id}`, noteResponseSchema),
  });
}

export function useTrash(enabled: boolean) {
  return useQuery({
    queryKey: ['trash'],
    enabled,
    queryFn: () => apiJson('/notes/trash', trashListResponseSchema),
  });
}

function useInvalidateNotes() {
  const qc = useQueryClient();
  return (noteId?: string) => {
    void qc.invalidateQueries({ queryKey: ['notes'] });
    void qc.invalidateQueries({ queryKey: ['folders'] });
    void qc.invalidateQueries({ queryKey: ['trash'] });
    if (noteId) void qc.invalidateQueries({ queryKey: ['note', noteId] });
  };
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: CreateNoteRequest) =>
      apiJson('/notes', noteResponseSchema, { method: 'POST', json: input }),
    onSuccess: () => invalidate(),
  });
}

/** Autosave (PUT /notes/:id). Aktualisiert den Cache ohne Refetch-Sturm. */
export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: PutNoteRequest & { id: string }) =>
      apiJson(`/notes/${id}`, noteResponseSchema, { method: 'PUT', json: input }),
    onSuccess: (note) => {
      qc.setQueryData(['note', note.id], note);
      void qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function usePatchNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, ...input }: PatchNoteRequest & { id: string }) =>
      apiJson(`/notes/${id}`, noteResponseSchema, { method: 'PATCH', json: input }),
    onSuccess: (note) => invalidate(note.id),
  });
}

export function useTrashNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) => apiVoid(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
  });
}

export function useRestoreNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) =>
      apiJson(`/notes/${id}/restore`, noteResponseSchema, { method: 'POST' }),
    onSuccess: () => invalidate(),
  });
}

export function useHardDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) => apiVoid(`/notes/${id}/hard`, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
  });
}
