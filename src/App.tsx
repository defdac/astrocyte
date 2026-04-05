import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { NoteEditor } from './components/NoteEditor';
import { NotesList } from './components/NotesList';
import { MindmapCanvas } from './components/MindmapCanvas';
import type { MindmapModel, Note, SettingsState, Topic } from './types';
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
    model_name: 'local-model',
    api_key_optional: '',
    timeout_ms: 30000,
    max_tokens: 160,
    temperature: 0.1,
    system_instruction_template:
      'Du är en strikt metadata- och klassificeringsmotor för Astrocyte. Returnera ENDAST giltig JSON enligt formatet {"title":"...","tags":["..."],"topics":[{"label":"...","score":0.0}]}. "title" ska vara en kort rubrik (max 8 ord), "tags" ska ha 1-5 korta taggar, och "topics" ska ha 1-5 ämnen som bäst representerar anteckningen. "score" ska vara ett tal mellan 0 och 1. Inga förklaringar, ingen markdown, inga extra fält.',
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

const normalizeTopicId = (label: string) => `t_${label.toLowerCase().replace(/[^a-z0-9åäö]+/gi, '_')}`;

const buildMindmap = (notes: Note[], existing: MindmapModel, topicsForNote: Record<string, Topic[]>): MindmapModel => {
  const topics = new Map<string, Topic>();
  const edges = [] as MindmapModel['edges'];

  for (const note of notes) {
    const noteTopics = topicsForNote[note.id] ?? [];
    for (const t of noteTopics) {
      topics.set(t.id, t);
      edges.push({ from: note.id, to: t.id, type: 'classified_as', w: t.score });
      edges.push({ from: note.id, to: t.id, type: 'mentions', w: Math.max(0.55, t.score - 0.05) });
    }
  }

  const clusterByRoot = new Map<string, string[]>();
  for (const topic of topics.values()) {
    const root = topic.parent ?? topic.id;
    const list = clusterByRoot.get(root) ?? [];
    if (topic.id !== root) list.push(topic.id);
    clusterByRoot.set(root, list);
    if (topic.parent) edges.push({ from: topic.id, to: root, type: 'child_of', w: 1.0 });
  }

  const clusters = Array.from(clusterByRoot.entries()).map(([root, children]) => ({
    id: `c_${root}`,
    label: topics.get(root)?.label ?? root,
    root_topic: root,
    size: edges.filter((e) => e.to === root).length,
    children
  }));

  return {
    ...existing,
    version: '1.0',
    notes,
    topics: Array.from(topics.values()),
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
  const [mindmap, setMindmap] = useState<MindmapModel>({ version: '1.0', notes: [], topics: [], edges: [], clusters: [] });
  const [topicByNote, setTopicByNote] = useState<Record<string, Topic[]>>({});

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
        const [storedNotes, storedMindmap] = await Promise.all([storageAdapter.listNotes(), storageAdapter.exportMindmap()]);
        setNotes(storedNotes);
        setMindmap(storedMindmap);
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

    const mappedTopics = classification.topics.map((t, idx) => ({
      id: normalizeTopicId(t.label) || `t_${idx}`,
      label: t.label,
      score: t.score,
      parent: null
    }));

    const nextNotes = [note, ...notes];
    const nextTopicByNote = { ...topicByNote, [note.id]: mappedTopics };
    const nextMindmap = buildMindmap(nextNotes, mindmap, nextTopicByNote);

    await storageAdapter.saveNote(note);
    await storageAdapter.importMindmap(nextMindmap);

    setTopicByNote(nextTopicByNote);
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
    const nextTopics = { ...topicByNote };
    delete nextTopics[id];
    const nextMindmap = buildMindmap(next, mindmap, nextTopics);
    await storageAdapter.deleteNote(id);
    await storageAdapter.importMindmap(nextMindmap);
    setTopicByNote(nextTopics);
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
