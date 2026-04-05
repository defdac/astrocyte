import type { SettingsState, StorageProvider } from '../types';

interface SettingsPanelProps {
  settings: SettingsState;
  onChange: (next: SettingsState) => void;
  onClose: () => void;
  onTestConnection: () => Promise<boolean>;
}

export function SettingsPanel({ settings, onChange, onClose, onTestConnection }: SettingsPanelProps) {
  const updateProvider = (provider: StorageProvider) => onChange({ ...settings, provider });

  const updateLLM = <K extends keyof SettingsState['llm']>(key: K, value: SettingsState['llm'][K]) => {
    onChange({ ...settings, llm: { ...settings.llm, [key]: value } });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Settings</h2>
        <section>
          <h3>Lagring</h3>
          <select value={settings.provider} onChange={(e) => updateProvider(e.target.value as StorageProvider)}>
            <option value="local">Lokal lagring</option>
            <option value="dropbox">Dropbox</option>
            <option value="gdrive">Google Drive</option>
          </select>
          <select
            value={settings.sync_mode}
            onChange={(e) => onChange({ ...settings, sync_mode: e.target.value as 'manual' | 'periodic' })}
          >
            <option value="manual">Manuell sync</option>
            <option value="periodic">Periodisk sync</option>
          </select>
          <input
            type="number"
            min={1}
            value={settings.sync_interval_minutes}
            onChange={(e) => onChange({ ...settings, sync_interval_minutes: Number(e.target.value) })}
          />
        </section>

        <section>
          <h3>Lokal LLM (ML Studio)</h3>
          <input value={settings.llm.base_url} onChange={(e) => updateLLM('base_url', e.target.value)} placeholder="Base URL" />
          <input
            value={settings.llm.cors_proxy_url}
            onChange={(e) => updateLLM('cors_proxy_url', e.target.value)}
            placeholder="CORS proxy URL (optional)"
          />
          <input value={settings.llm.model_name} onChange={(e) => updateLLM('model_name', e.target.value)} placeholder="Model" />
          <input value={settings.llm.api_key_optional} onChange={(e) => updateLLM('api_key_optional', e.target.value)} placeholder="API key (optional)" />
          <input
            type="number"
            min={1000}
            step={1000}
            value={settings.llm.timeout_ms}
            onChange={(e) => updateLLM('timeout_ms', Number(e.target.value))}
            placeholder="Timeout (ms)"
          />
          <textarea
            value={settings.llm.system_instruction_template}
            onChange={(e) => updateLLM('system_instruction_template', e.target.value)}
            placeholder="Systeminstruktion för klassificering"
            rows={4}
          />
          <textarea
            value={settings.llm.classification_prompt_template}
            onChange={(e) => updateLLM('classification_prompt_template', e.target.value)}
            placeholder="Promptmall för klassificering"
            rows={4}
          />
          <input
            value={settings.llm.healthcheck_endpoint}
            onChange={(e) => updateLLM('healthcheck_endpoint', e.target.value)}
            placeholder="Health endpoint"
          />
          <button onClick={() => void onTestConnection()}>Test Connection</button>
        </section>

        <footer>
          <button onClick={onClose}>Stäng</button>
        </footer>
      </div>
    </div>
  );
}
