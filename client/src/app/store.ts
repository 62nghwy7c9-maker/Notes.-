import { create } from 'zustand';

/** Aktuelle Auswahl in der Sidebar. */
export type Selection =
  | { kind: 'inbox' }
  | { kind: 'folder'; folderId: string }
  | { kind: 'trash' };

interface UiState {
  selection: Selection;
  noteId: string | null;
  paletteOpen: boolean;
  select: (selection: Selection) => void;
  openNote: (noteId: string | null) => void;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selection: { kind: 'inbox' },
  noteId: null,
  paletteOpen: false,
  select: (selection) => set({ selection, noteId: null }),
  openNote: (noteId) => set({ noteId }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));
