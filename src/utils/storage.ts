export interface LLMSettings {
  provider: 'ollama' | 'openai' | 'anthropic';
  ollama: {
    host: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
}

export interface AppState {
  onboarded: boolean;
  enabled: boolean;
}

const DEFAULT_SETTINGS: LLMSettings = {
  provider: 'ollama',
  ollama: {
    host: 'http://localhost:11434',
    model: '',
  },
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
  },
};

const DEFAULT_STATE: AppState = {
  onboarded: false,
  enabled: true,
};

export const storage = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? defaultValue;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },

  async getSettings(): Promise<LLMSettings> {
    return this.get<LLMSettings>('settings', DEFAULT_SETTINGS);
  },

  async saveSettings(settings: LLMSettings): Promise<void> {
    await this.set('settings', settings);
  },

  async getState(): Promise<AppState> {
    return this.get<AppState>('appState', DEFAULT_STATE);
  },

  async setState(state: Partial<AppState>): Promise<void> {
    const current = await this.getState();
    await this.set('appState', { ...current, ...state });
  },

  async isOnboarded(): Promise<boolean> {
    const state = await this.getState();
    return state.onboarded;
  },

  async isEnabled(): Promise<boolean> {
    const state = await this.getState();
    return state.enabled;
  },
};
