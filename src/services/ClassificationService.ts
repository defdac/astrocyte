import type { Note, SettingsState } from '../types';

export interface ClassifiedTopic {
  label: string;
  score: number;
}

interface ClassificationResponse {
  topics: ClassifiedTopic[];
}

export class ClassificationService {
  constructor(private settings: SettingsState['llm']) {}

  updateSettings(settings: SettingsState['llm']): void {
    this.settings = settings;
  }

  async classify(note: Note, optional_context_summary?: string): Promise<ClassificationResponse> {
    const prompt = this.settings.classification_prompt_template
      .replace('{title}', note.title)
      .replace('{text}', note.text)
      .replace('{context}', optional_context_summary ?? '');

    const body = {
      model: this.settings.model_name,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.settings.max_tokens,
      temperature: this.settings.temperature
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.settings.timeout_ms);

    try {
      const res = await fetch(`${this.settings.base_url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.settings.api_key_optional ? { Authorization: `Bearer ${this.settings.api_key_optional}` } : {})
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? '{"topics":[]}';
      const parsed = JSON.parse(content) as ClassificationResponse;
      return { topics: parsed.topics ?? [] };
    } catch {
      return { topics: [] };
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthcheck(): Promise<boolean> {
    const endpoint = `${this.settings.base_url}${this.settings.healthcheck_endpoint}`;
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
}
