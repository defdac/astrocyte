export interface Note {
  id: string;
  title: string;
  text: string;
  tags: string[];
  ts: string;
}

export interface Topic {
  id: string;
  label: string;
  score: number;
  parent: string | null;
}

export interface Edge {
  from: string;
  to: string;
  type: 'classified_as' | 'mentions' | 'child_of';
  w: number;
}

export interface Cluster {
  id: string;
  label: string;
  root_topic: string;
  size: number;
  children: string[];
}

export interface MindmapModel {
  version: '1.0';
  notes: Note[];
  topics: Topic[];
  edges: Edge[];
  clusters: Cluster[];
}

export type StorageProvider = 'local' | 'dropbox' | 'gdrive';

export interface SettingsState {
  provider: StorageProvider;
  oauth_connected: boolean;
  sync_mode: 'manual' | 'periodic';
  sync_interval_minutes: number;
  llm: {
    base_url: string;
    model_name: string;
    api_key_optional: string;
    timeout_ms: number;
    max_tokens: number;
    temperature: number;
    system_instruction_template: string;
    classification_prompt_template: string;
    healthcheck_endpoint: string;
  };
}
