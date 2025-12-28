import { storage } from '../utils/storage';
import './popup.css';

const statusEl = document.getElementById('status')!;
const toggleEnabled = document.getElementById('toggle-enabled') as HTMLInputElement;
const providerNameEl = document.getElementById('provider-name')!;
const btnSettings = document.getElementById('btn-settings')!;
const btnTest = document.getElementById('btn-test')!;

async function init() {
  // Load current state
  const state = await storage.getState();
  const settings = await storage.getSettings();

  toggleEnabled.checked = state.enabled;
  updateProviderDisplay(settings.provider);

  if (!state.enabled) {
    updateStatus('disabled', 'Disabled');
  } else {
    // Test connection on load
    testConnection(settings.provider);
  }
}

function updateStatus(type: 'connected' | 'disconnected' | 'disabled', text: string) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = text;
}

function updateProviderDisplay(provider: string) {
  const names: Record<string, string> = {
    ollama: 'Ollama (Local)',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
  };
  providerNameEl.textContent = names[provider] || provider;
}

async function testConnection(provider: string) {
  updateStatus('disconnected', 'Testing...');

  const result = await chrome.runtime.sendMessage({
    type: 'TEST_CONNECTION',
    provider,
  });

  if (result.success) {
    updateStatus('connected', 'Connected');
  } else {
    updateStatus('disconnected', 'Disconnected');
  }
}

// Toggle enabled state
toggleEnabled.addEventListener('change', async () => {
  const enabled = toggleEnabled.checked;
  await storage.setState({ enabled });

  if (enabled) {
    const settings = await storage.getSettings();
    testConnection(settings.provider);
  } else {
    updateStatus('disabled', 'Disabled');
  }

  // Notify all tabs to update
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'ENABLED_CHANGED', enabled }).catch(() => {
          // Tab might not have content script
        });
      }
    });
  });
});

// Settings button
btnSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Test button
btnTest.addEventListener('click', async () => {
  const settings = await storage.getSettings();
  testConnection(settings.provider);
});

init();
