import { storage, LLMSettings } from '../utils/storage';
import './options.css';

// Elements
const providerRadios = document.querySelectorAll<HTMLInputElement>('input[name="provider"]');
const ollamaSettings = document.getElementById('ollama-settings')!;
const openaiSettings = document.getElementById('openai-settings')!;
const anthropicSettings = document.getElementById('anthropic-settings')!;

const ollamaHost = document.getElementById('ollama-host') as HTMLInputElement;
const ollamaModel = document.getElementById('ollama-model') as HTMLSelectElement;
const refreshModelsBtn = document.getElementById('refresh-models')!;
const testOllamaBtn = document.getElementById('test-ollama')!;
const ollamaStatus = document.getElementById('ollama-status')!;

const openaiKey = document.getElementById('openai-key') as HTMLInputElement;
const openaiModel = document.getElementById('openai-model') as HTMLSelectElement;
const testOpenaiBtn = document.getElementById('test-openai')!;
const openaiStatus = document.getElementById('openai-status')!;

const anthropicKey = document.getElementById('anthropic-key') as HTMLInputElement;
const anthropicModel = document.getElementById('anthropic-model') as HTMLSelectElement;
const testAnthropicBtn = document.getElementById('test-anthropic')!;
const anthropicStatus = document.getElementById('anthropic-status')!;

const saveBtn = document.getElementById('save')!;
const saveStatus = document.getElementById('save-status')!;

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Provider switching
providerRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    updateVisibleSettings(radio.value as LLMSettings['provider']);
  });
});

// Event listeners
refreshModelsBtn.addEventListener('click', refreshOllamaModels);
testOllamaBtn.addEventListener('click', () => testConnection('ollama'));
testOpenaiBtn.addEventListener('click', () => testConnection('openai'));
testAnthropicBtn.addEventListener('click', () => testConnection('anthropic'));
saveBtn.addEventListener('click', saveSettings);

async function loadSettings() {
  const settings = await storage.getSettings();

  // Set provider
  const providerRadio = document.querySelector<HTMLInputElement>(
    `input[name="provider"][value="${settings.provider}"]`
  );
  if (providerRadio) {
    providerRadio.checked = true;
    updateVisibleSettings(settings.provider);
  }

  // Ollama
  ollamaHost.value = settings.ollama.host;
  ollamaModel.value = settings.ollama.model;

  // OpenAI
  openaiKey.value = settings.openai.apiKey;
  openaiModel.value = settings.openai.model;

  // Anthropic
  anthropicKey.value = settings.anthropic.apiKey;
  anthropicModel.value = settings.anthropic.model;

  // Try to load Ollama models
  refreshOllamaModels();
}

function updateVisibleSettings(provider: LLMSettings['provider']) {
  ollamaSettings.classList.toggle('hidden', provider !== 'ollama');
  openaiSettings.classList.toggle('hidden', provider !== 'openai');
  anthropicSettings.classList.toggle('hidden', provider !== 'anthropic');
}

async function refreshOllamaModels() {
  try {
    const host = ollamaHost.value || 'http://localhost:11434';
    const response = await fetch(`${host}/api/tags`);

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    const models = data.models || [];

    // Save current selection
    const currentModel = ollamaModel.value;

    // Clear and repopulate
    ollamaModel.innerHTML = '';
    models.forEach((model: { name: string }) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = model.name;
      ollamaModel.appendChild(option);
    });

    // Restore selection if still available
    if (models.some((m: { name: string }) => m.name === currentModel)) {
      ollamaModel.value = currentModel;
    }

    ollamaStatus.textContent = `Found ${models.length} models`;
    ollamaStatus.className = 'status-message success';
  } catch (error) {
    ollamaStatus.textContent = 'Could not connect to Ollama';
    ollamaStatus.className = 'status-message error';
  }
}

async function testConnection(provider: string) {
  // First save current values
  await saveSettingsQuiet();

  const statusEl = provider === 'ollama' ? ollamaStatus :
                   provider === 'openai' ? openaiStatus : anthropicStatus;

  statusEl.textContent = 'Testing...';
  statusEl.className = 'status-message';

  const result = await chrome.runtime.sendMessage({
    type: 'TEST_CONNECTION',
    provider,
  });

  if (result.success) {
    statusEl.textContent = 'Connection successful!';
    statusEl.className = 'status-message success';
  } else {
    statusEl.textContent = result.error || 'Connection failed';
    statusEl.className = 'status-message error';
  }
}

async function saveSettingsQuiet() {
  const provider = document.querySelector<HTMLInputElement>(
    'input[name="provider"]:checked'
  )?.value as LLMSettings['provider'];

  const settings: LLMSettings = {
    provider,
    ollama: {
      host: ollamaHost.value,
      model: ollamaModel.value,
    },
    openai: {
      apiKey: openaiKey.value,
      model: openaiModel.value,
    },
    anthropic: {
      apiKey: anthropicKey.value,
      model: anthropicModel.value,
    },
  };

  await storage.saveSettings(settings);
}

async function saveSettings() {
  await saveSettingsQuiet();

  saveStatus.textContent = 'Settings saved!';
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2000);
}
