import type { MindmapModel, Note } from '../types';

export interface StorageAdapter {
  init(): Promise<void>;
  saveNote(note: Note): Promise<void>;
  listNotes(): Promise<Note[]>;
  deleteNote(noteId: string): Promise<void>;
  exportMindmap(): Promise<MindmapModel>;
  importMindmap(model: MindmapModel): Promise<void>;
}
