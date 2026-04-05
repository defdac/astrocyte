import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { NoteEditor } from './components/NoteEditor';
import { NotesList } from './components/NotesList';
import { MindmapCanvas } from './components/MindmapCanvas';
import type { MindmapModel, Note, SettingsState } from './types';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter';
import { DropboxStorageAdapter, GoogleDriveStorageAdapter } from './storage/CloudStubs';
import type { StorageAdapter } from './storage/StorageAdapter';
import { ClassificationService } from './services/ClassificationService';

const SETTINGS_KEY = 'astrocyte.settings';

const defaultSettings: SettingsState = {
  provider: 'local',
  oauth_connected: false,
  sync_mode: 'manual',
  sync_interval_minutes: 15,
  llm: {
    base_url: 'http://127.0.0.1:1234',
    cors_proxy_url: '',
    model_name: 'qwen2.5-coder-7b-instruct.gguf',
    api_key_optional: '',
    timeout_ms: 30000,
    max_tokens: 160,
    temperature: 0.1,
    system_instruction_template:
      'Du är en strikt metadata- och klassificeringsmotor för. Returnera ENDAST giltig JSON enligt formatet {"title":"...","tags":["..."],"topics":[{"label":"...","score":0.0}]}. "title" ska vara en kort rubrik (max 8 ord), "tags" ska ha 1-5 korta taggar, och "topics" ska ha 1-5 ämnen som bäst representerar anteckningen. "score" ska vara ett tal mellan 0 och 1. Inga förklaringar, ingen markdown, inga extra fält.',
    classification_prompt_template:
      'Generera titel, taggar och klassificering enligt JSON-kontraktet. Titel: {title}. Text: {text}. Kontext: {context}',
    healthcheck_endpoint: '/v1/models'
  }
};

const readSettings = (): SettingsState => {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  const parsed = JSON.parse(raw) as Partial<SettingsState>;
  return {
    ...defaultSettings,
    ...parsed,
    llm: {
      ...defaultSettings.llm,
      ...(parsed.llm ?? {})
    }
  };
};

const normalizeTag = (tag: string) => tag.trim().toLowerCase();
const normalizeTagId = (tag: string) => `c_${normalizeTag(tag).replace(/[^a-z0-9åäö]+/gi, '_')}`;

const buildMindmap = (notes: Note[]): MindmapModel => {
  const edges = [] as MindmapModel['edges'];
  const tagToNotes = new Map<string, Set<string>>();
  const tagLabels = new Map<string, string>();
  const tagsByNote = new Map<string, string[]>();

  for (const note of notes) {
    const normalizedTags = Array.from(
      new Set(
        note.tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => {
            const normalized = normalizeTag(tag);
            if (!tagLabels.has(normalized)) tagLabels.set(normalized, tag);
            return normalized;
          })
      )
    );

    tagsByNote.set(note.id, normalizedTags);

    for (const tag of normalizedTags) {
      const existing = tagToNotes.get(tag) ?? new Set<string>();
      existing.add(note.id);
      tagToNotes.set(tag, existing);
    }
  }

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const left = notes[i];
      const right = notes[j];
      const leftTags = new Set(tagsByNote.get(left.id) ?? []);
      const sharedTags = (tagsByNote.get(right.id) ?? []).filter((tag) => leftTags.has(tag));

      if (!sharedTags.length) continue;

      const totalDistinctTags = new Set([...(tagsByNote.get(left.id) ?? []), ...(tagsByNote.get(right.id) ?? [])]).size || 1;
      const overlap = sharedTags.length / totalDistinctTags;
      const weight = Math.min(1, 0.55 + sharedTags.length * 0.15 + overlap * 0.3);

      edges.push({
        from: left.id,
        to: right.id,
        type: 'shared_tag',
        w: weight,
        shared_tags: sharedTags.map((tag) => tagLabels.get(tag) ?? tag)
      });
    }
  }

  const clusters = Array.from(tagToNotes.entries())
    .map(([tag, noteIds]) => ({
      id: normalizeTagId(tag),
      label: tagLabels.get(tag) ?? tag,
      tag,
      size: noteIds.size,
      note_ids: Array.from(noteIds)
    }))
    .sort((a, b) => b.size - a.size || a.label.localeCompare(b.label));

  return {
    version: '1.0',
    notes,
    edges,
    clusters
  };
};

const toGeneratedMetadata = (text: string, title?: string, tags?: string[], topicLabels: string[] = []) => {
  const generatedTitle = title?.trim() || text.split('\n').find(Boolean)?.trim()?.slice(0, 80) || 'Untitled note';
  const generatedTags = (tags?.length ? tags : topicLabels).slice(0, 5);
  return { title: generatedTitle, tags: generatedTags };
};

export default function App() {
  const [view, setView] = useState<'mindmap' | 'notes' | 'editor'>('mindmap');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [notes, setNotes] = useState<Note[]>([]);
  const [mindmap, setMindmap] = useState<MindmapModel>({ version: '1.0', notes: [], edges: [], clusters: [] });

  const storageAdapter: StorageAdapter = useMemo(() => {
    if (settings.provider === 'dropbox') return new DropboxStorageAdapter();
    if (settings.provider === 'gdrive') return new GoogleDriveStorageAdapter();
    return new LocalStorageAdapter();
  }, [settings.provider]);

  const classifier = useMemo(() => new ClassificationService(settings.llm), [settings.llm]);

  useEffect(() => {
    const initialSettings = readSettings();
    setSettings(initialSettings);
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    void storageAdapter
      .init()
      .then(async () => {
        const storedNotes = await storageAdapter.listNotes();
        const rebuiltMindmap = buildMindmap(storedNotes);
        await storageAdapter.importMindmap(rebuiltMindmap);
        setNotes(storedNotes);
        setMindmap(rebuiltMindmap);
      })
      .catch(() => undefined);
  }, [settings, storageAdapter]);

  const saveNote = async (text: string) => {
    const baseNote = {
      id: `n_${crypto.randomUUID().slice(0, 8)}`,
      title: '',
      text,
      tags: [],
      ts: new Date().toISOString()
    } as Note;

    const classification = await classifier.classify(baseNote);
    const generated = toGeneratedMetadata(
      text,
      classification.title,
      classification.tags,
      classification.topics.map((topic) => topic.label)
    );

    const note: Note = {
      ...baseNote,
      title: generated.title,
      tags: generated.tags
    };

    const nextNotes = [note, ...notes];
    const nextMindmap = buildMindmap(nextNotes);

    await storageAdapter.saveNote(note);
    await storageAdapter.importMindmap(nextMindmap);

    setNotes(nextNotes);
    setMindmap(nextMindmap);
    setView('mindmap');
    return generated;
  };

  const generateMetadata = async (text: string) => {
    const baseNote: Note = {
      id: 'preview',
      title: '',
      text,
      tags: [],
      ts: new Date().toISOString()
    };
    const classification = await classifier.classify(baseNote);
    return toGeneratedMetadata(
      text,
      classification.title,
      classification.tags,
      classification.topics.map((topic) => topic.label)
    );
  };

  const deleteNote = async (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    const nextMindmap = buildMindmap(next);
    await storageAdapter.deleteNote(id);
    await storageAdapter.importMindmap(nextMindmap);
    setNotes(next);
    setMindmap(nextMindmap);
  };

  return (
    <div className="app-shell">
      <Sidebar active={view} onNavigate={setView} onOpenSettings={() => setSettingsOpen(true)} />
      <main>
        {view === 'mindmap' && <MindmapCanvas model={mindmap} />}
        {view === 'notes' && <NotesList notes={notes} onDelete={(id) => void deleteNote(id)} />}
        {view === 'editor' && <NoteEditor onGenerateMetadata={generateMetadata} onSave={saveNote} />}
      </main>
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          onTestConnection={async () => {
            classifier.updateSettings(settings.llm);
            const ok = await classifier.healthcheck();
            alert(ok ? 'Connection OK' : 'Connection failed');
            return ok;
          }}
        />
      )}
    </div>
  );
}
