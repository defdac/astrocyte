import type { Note, SettingsState } from '../types';

export interface ClassifiedTopic {
  label: string;
  score: number;
}

interface ClassificationResponse {
  title?: string;
  tags?: string[];
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
      const res = await fetch(this.buildRequestUrl('/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.settings.api_key_optional ? { Authorization: `Bearer ${this.settings.api_key_optional}` } : {})
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? '{"title":"","tags":[],"topics":[]}';
      const parsed = this.parseClassificationContent(content);
      return {
        title: parsed.title,
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => Boolean(tag?.trim())).map((tag) => tag.trim()) : [],
        topics: parsed.topics ?? []
      };
    } catch {
      return { title: '', tags: [], topics: [] };
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthcheck(): Promise<boolean> {
    const endpoint = this.buildRequestUrl(this.settings.healthcheck_endpoint);
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async canGenerate(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.settings.timeout_ms, 8000));
    try {
      const res = await fetch(this.buildRequestUrl('/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.settings.api_key_optional ? { Authorization: `Bearer ${this.settings.api_key_optional}` } : {})
        },
        body: JSON.stringify({
          model: this.settings.model_name,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0
        }),
        signal: controller.signal
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildEndpoint(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.getRequestBaseUrl()}${normalizedPath}`;
  }

  private buildRequestUrl(path: string): string {
    const endpoint = this.buildEndpoint(path);
    return this.applyCorsProxy(endpoint);
  }

  private applyCorsProxy(endpoint: string): string {
    const proxy = this.settings.cors_proxy_url?.trim();
    if (!proxy) return endpoint;
    if (!/^https?:\/\//i.test(proxy)) return endpoint;

    const normalizedProxy = proxy.replace(/\/+$/, '');
    if (normalizedProxy.includes('{url}')) {
      return normalizedProxy.replace('{url}', encodeURIComponent(endpoint));
    }
    return `${normalizedProxy}/${encodeURIComponent(endpoint)}`;
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
      if (!match) return { title: '', tags: [], topics: [] };
      try {
        return JSON.parse(match[0]) as ClassificationResponse;
      } catch {
        return { title: '', tags: [], topics: [] };
      }
    }
  }
}
