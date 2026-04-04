import type { MindmapModel, Note } from '../types';
import type { StorageAdapter } from './StorageAdapter';

const unsupported = (provider: string): never => {
  throw new Error(`${provider} adapter not connected yet (M3).`);
};

export class DropboxStorageAdapter implements StorageAdapter {
  async init(): Promise<void> { unsupported('Dropbox'); }
  async saveNote(_note: Note): Promise<void> { unsupported('Dropbox'); }
  async listNotes(): Promise<Note[]> { unsupported('Dropbox'); }
  async deleteNote(_noteId: string): Promise<void> { unsupported('Dropbox'); }
  async exportMindmap(): Promise<MindmapModel> { unsupported('Dropbox'); }
  async importMindmap(_model: MindmapModel): Promise<void> { unsupported('Dropbox'); }
}

export class GoogleDriveStorageAdapter implements StorageAdapter {
  async init(): Promise<void> { unsupported('Google Drive'); }
  async saveNote(_note: Note): Promise<void> { unsupported('Google Drive'); }
  async listNotes(): Promise<Note[]> { unsupported('Google Drive'); }
  async deleteNote(_noteId: string): Promise<void> { unsupported('Google Drive'); }
  async exportMindmap(): Promise<MindmapModel> { unsupported('Google Drive'); }
  async importMindmap(_model: MindmapModel): Promise<void> { unsupported('Google Drive'); }
}
