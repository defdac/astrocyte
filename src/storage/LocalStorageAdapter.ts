import type { MindmapModel, Note } from '../types';
import type { StorageAdapter } from './StorageAdapter';

const NOTES_KEY = 'astrocyte.notes';
const MINDMAP_KEY = 'astrocyte.mindmap';

const emptyMindmap = (): MindmapModel => ({
  version: '1.0',
  notes: [],
  topics: [],
  edges: [],
  clusters: []
});

export class LocalStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {
    if (!localStorage.getItem(NOTES_KEY)) {
      localStorage.setItem(NOTES_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(MINDMAP_KEY)) {
      localStorage.setItem(MINDMAP_KEY, JSON.stringify(emptyMindmap()));
    }
  }

  async saveNote(note: Note): Promise<void> {
    const notes = await this.listNotes();
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) notes[idx] = note;
    else notes.unshift(note);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  async listNotes(): Promise<Note[]> {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  }

  async deleteNote(noteId: string): Promise<void> {
    const notes = await this.listNotes();
    const filtered = notes.filter((n) => n.id !== noteId);
    localStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
  }

  async exportMindmap(): Promise<MindmapModel> {
    const raw = localStorage.getItem(MINDMAP_KEY);
    if (!raw) return emptyMindmap();
    return JSON.parse(raw) as MindmapModel;
  }

  async importMindmap(model: MindmapModel): Promise<void> {
    localStorage.setItem(MINDMAP_KEY, JSON.stringify(model));
  }
}
