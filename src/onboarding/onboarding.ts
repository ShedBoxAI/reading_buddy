import { storage, LLMSettings } from '../utils/storage';
import './onboarding.css';

// Steps
const stepWelcome = document.getElementById('step-welcome')!;
const stepProvider = document.getElementById('step-provider')!;
const stepOllama = document.getElementById('step-ollama')!;
const stepOpenai = document.getElementById('step-openai')!;
const stepAnthropic = document.getElementById('step-anthropic')!;
const stepSuccess = document.getElementById('step-success')!;

// Buttons
const btnGetStarted = document.getElementById('btn-get-started')!;
const btnBackOllama = document.getElementById('btn-back-ollama')!;
const btnBackOpenai = document.getElementById('btn-back-openai')!;
const btnBackAnthropic = document.getElementById('btn-back-anthropic')!;
const btnTestOllama = document.getElementById('btn-test-ollama') as HTMLButtonElement;
const btnTestOpenai = document.getElementById('btn-test-openai') as HTMLButtonElement;
const btnTestAnthropic = document.getElementById('btn-test-anthropic') as HTMLButtonElement;
const btnFinish = document.getElementById('btn-finish')!;
const refreshModelsBtn = document.getElementById('refresh-models')!;

// Inputs
const ollamaHost = document.getElementById('ollama-host') as HTMLInputElement;
const ollamaModel = document.getElementById('ollama-model') as HTMLSelectElement;
const openaiKey = document.getElementById('openai-key') as HTMLInputElement;
const openaiModel = document.getElementById('openai-model') as HTMLSelectElement;
const anthropicKey = document.getElementById('anthropic-key') as HTMLInputElement;
const anthropicModel = document.getElementById('anthropic-model') as HTMLSelectElement;

// Status
const ollamaStatus = document.getElementById('ollama-status')!;
const openaiStatus = document.getElementById('openai-status')!;
const anthropicStatus = document.getElementById('anthropic-status')!;

// Provider cards
const providerCards = document.querySelectorAll('.provider-card');

let selectedProvider: LLMSettings['provider'] = 'ollama';
let connectionTested = false;

// Navigation
function showStep(step: HTMLElement) {
  [stepWelcome, stepProvider, stepOllama, stepOpenai, stepAnthropic, stepSuccess].forEach(s => {
    s.classList.add('hidden');
  });
  step.classList.remove('hidden');
}

// Event Listeners
btnGetStarted.addEventListener('click', () => showStep(stepProvider));

providerCards.forEach(card => {
  card.addEventListener('click', () => {
    selectedProvider = card.getAttribute('data-provider') as LLMSettings['provider'];
    providerCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    connectionTested = false;

    // Navigate to config step
    setTimeout(() => {
      switch (selectedProvider) {
        case 'ollama':
          showStep(stepOllama);
          refreshOllamaModels();
          break;
        case 'openai':
          showStep(stepOpenai);
          break;
        case 'anthropic':
          showStep(stepAnthropic);
          break;
      }
    }, 200);
  });
});

btnBackOllama.addEventListener('click', () => showStep(stepProvider));
btnBackOpenai.addEventListener('click', () => showStep(stepProvider));
btnBackAnthropic.addEventListener('click', () => showStep(stepProvider));

refreshModelsBtn.addEventListener('click', refreshOllamaModels);

btnTestOllama.addEventListener('click', () => testConnection('ollama'));
btnTestOpenai.addEventListener('click', () => testConnection('openai'));
btnTestAnthropic.addEventListener('click', () => testConnection('anthropic'));

btnFinish.addEventListener('click', async () => {
  await storage.setState({ onboarded: true });
  window.close();
});

// Ollama model refresh
async function refreshOllamaModels() {
  try {
    const host = ollamaHost.value || 'http://localhost:11434';
    const response = await fetch(`${host}/api/tags`);

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    const models = data.models || [];

    ollamaModel.innerHTML = '';

    if (models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No models found';
      ollamaModel.appendChild(option);
      return;
    }

    models.forEach((model: { name: string }) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = model.name;
      ollamaModel.appendChild(option);
    });

    showStatus(ollamaStatus, `Found ${models.length} model${models.length === 1 ? '' : 's'}`, 'success');
  } catch {
    ollamaModel.innerHTML = '<option value="">Could not connect</option>';
    showStatus(ollamaStatus, 'Could not connect to Ollama. Is it running?', 'error');
  }
}

// Connection test
async function testConnection(provider: string) {
  const statusEl = provider === 'ollama' ? ollamaStatus :
                   provider === 'openai' ? openaiStatus : anthropicStatus;
  const btn = provider === 'ollama' ? btnTestOllama :
              provider === 'openai' ? btnTestOpenai : btnTestAnthropic;

  // Save settings first
  await saveCurrentSettings();

  showStatus(statusEl, 'Testing connection...', 'loading');
  btn.disabled = true;

  const result = await chrome.runtime.sendMessage({
    type: 'TEST_CONNECTION',
    provider,
  });

  btn.disabled = false;

  if (result.success) {
    showStatus(statusEl, 'Connection successful!', 'success');
    connectionTested = true;

    // Show success after short delay
    setTimeout(() => {
      showStep(stepSuccess);
    }, 1000);
  } else {
    showStatus(statusEl, result.error || 'Connection failed', 'error');
  }
}

function showStatus(el: HTMLElement, message: string, type: 'loading' | 'success' | 'error') {
  el.textContent = message;
  el.className = `status-box show ${type}`;
}

async function saveCurrentSettings() {
  const settings: LLMSettings = {
    provider: selectedProvider,
    ollama: {
      host: ollamaHost.value || 'http://localhost:11434',
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

// Load any existing settings
async function loadExistingSettings() {
  const settings = await storage.getSettings();

  ollamaHost.value = settings.ollama.host;
  openaiKey.value = settings.openai.apiKey;
  openaiModel.value = settings.openai.model;
  anthropicKey.value = settings.anthropic.apiKey;
  anthropicModel.value = settings.anthropic.model;
}

loadExistingSettings();
