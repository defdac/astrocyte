export interface Note {
  id: string;
  title: string;
  text: string;
  tags: string[];
  ts: string;
}

export interface Edge {
  from: string;
  to: string;
  type: 'shared_tag';
  w: number;
  shared_tags: string[];
}

export interface Cluster {
  id: string;
  label: string;
  tag: string;
  size: number;
  note_ids: string[];
}

export interface MindmapModel {
  version: '1.0';
  notes: Note[];
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
    cors_proxy_url: string;
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
