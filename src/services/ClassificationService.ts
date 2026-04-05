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
    const systemInstruction = this.settings.system_instruction_template;
    const prompt = this.settings.classification_prompt_template
      .replace('{title}', note.title)
      .replace('{text}', note.text)
      .replace('{context}', optional_context_summary ?? '');

    const body = {
      model: this.settings.model_name,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      max_tokens: this.settings.max_tokens,
      temperature: this.settings.temperature
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.settings.timeout_ms);

    try {
      const res = await fetch(this.buildEndpoint('/v1/chat/completions'), {
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
      const parsed = this.parseClassificationContent(content);
      return { topics: parsed.topics ?? [] };
    } catch {
      return { topics: [] };
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthcheck(): Promise<boolean> {
    const endpoint = this.buildEndpoint(this.settings.healthcheck_endpoint);
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private buildEndpoint(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.getRequestBaseUrl()}${normalizedPath}`;
  }

  private getRequestBaseUrl(): string {
    const configured = this.settings.base_url.trim().replace(/\/+$/, '');

    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return configured;
    }

    try {
      const url = new URL(configured);
      const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);
      if (loopbackHosts.has(url.hostname)) {
        return '/__llm_proxy';
      }
    } catch {
      // Fallback to configured URL when base_url cannot be parsed.
    }

    return configured;
  }

  private parseClassificationContent(content: string): ClassificationResponse {
    try {
      return JSON.parse(content) as ClassificationResponse;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return { topics: [] };
      try {
        return JSON.parse(match[0]) as ClassificationResponse;
      } catch {
        return { topics: [] };
      }
    }
  }
}
