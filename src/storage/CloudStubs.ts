import type { MindmapModel, Note } from '../types';
import type { StorageAdapter } from './StorageAdapter';

const unsupported = (provider: string): Error =>
  new Error(`${provider} adapter not connected yet (M3).`);

const unsupportedAsync = <T>(provider: string): Promise<T> =>
  Promise.reject(unsupported(provider));

export class DropboxStorageAdapter implements StorageAdapter {
  async init(): Promise<void> { return unsupportedAsync<void>('Dropbox'); }
  async saveNote(_note: Note): Promise<void> { return unsupportedAsync<void>('Dropbox'); }
  async listNotes(): Promise<Note[]> { return unsupportedAsync<Note[]>('Dropbox'); }
  async deleteNote(_noteId: string): Promise<void> { return unsupportedAsync<void>('Dropbox'); }
  async exportMindmap(): Promise<MindmapModel> { return unsupportedAsync<MindmapModel>('Dropbox'); }
  async importMindmap(_model: MindmapModel): Promise<void> { return unsupportedAsync<void>('Dropbox'); }
}

export class GoogleDriveStorageAdapter implements StorageAdapter {
  async init(): Promise<void> { return unsupportedAsync<void>('Google Drive'); }
  async saveNote(_note: Note): Promise<void> { return unsupportedAsync<void>('Google Drive'); }
  async listNotes(): Promise<Note[]> { return unsupportedAsync<Note[]>('Google Drive'); }
  async deleteNote(_noteId: string): Promise<void> { return unsupportedAsync<void>('Google Drive'); }
  async exportMindmap(): Promise<MindmapModel> { return unsupportedAsync<MindmapModel>('Google Drive'); }
  async importMindmap(_model: MindmapModel): Promise<void> { return unsupportedAsync<void>('Google Drive'); }
}
