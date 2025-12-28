import { getLLMProvider, OllamaProvider, OpenAIProvider, AnthropicProvider } from './llm';
import { storage } from '../utils/storage';
import type { MessageType, PageContext, Message } from '../utils/messaging';

// Open onboarding page on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Check if already onboarded (shouldn't be on fresh install, but just in case)
    const isOnboarded = await storage.isOnboarded();
    if (!isOnboarded) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('onboarding/onboarding.html'),
      });
    }
  }
});

// Also check on startup (in case user closes onboarding without completing)
chrome.runtime.onStartup.addListener(async () => {
  const isOnboarded = await storage.isOnboarded();
  if (!isOnboarded) {
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding/onboarding.html'),
    });
  }
});

// Handle port connections for streaming
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name);
  if (port.name !== 'reading-buddy-stream') return;

  port.onMessage.addListener(async (msg: MessageType) => {
    console.log('Received message:', msg.type);
    if (msg.type === 'EXPLAIN_TEXT') {
      console.log('Context:', msg.payload.context.selectedText);
      await handleExplainText(port, msg.payload.context, msg.payload.history);
    }
  });
});

// Handle one-off messages
chrome.runtime.onMessage.addListener((msg: MessageType, _sender, sendResponse) => {
  if (msg.type === 'GET_SETTINGS') {
    storage.getSettings().then(sendResponse);
    return true;
  }

  if (msg.type === 'GET_STATE') {
    storage.getState().then(sendResponse);
    return true;
  }

  if (msg.type === 'TEST_CONNECTION') {
    testConnection(msg.provider).then(sendResponse);
    return true;
  }

  return false;
});

async function handleExplainText(
  port: chrome.runtime.Port,
  context: PageContext,
  history: Message[]
) {
  try {
    // Check if enabled
    const isEnabled = await storage.isEnabled();
    if (!isEnabled) {
      port.postMessage({ type: 'STREAM_ERROR', error: 'ReadingBuddy is disabled' });
      return;
    }

    console.log('handleExplainText called');
    const provider = await getLLMProvider();
    console.log('Got provider:', provider.name);

    for await (const chunk of provider.generateStream(context, history)) {
      console.log('Chunk:', chunk.slice(0, 50));
      port.postMessage({ type: 'STREAM_CHUNK', content: chunk });
    }

    console.log('Stream complete');
    port.postMessage({ type: 'STREAM_END' });
  } catch (error) {
    console.error('Error in handleExplainText:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    port.postMessage({ type: 'STREAM_ERROR', error: errorMessage });
  }
}

async function testConnection(providerName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await storage.getSettings();
    let provider;

    switch (providerName) {
      case 'ollama':
        provider = new OllamaProvider(settings.ollama);
        break;
      case 'openai':
        provider = new OpenAIProvider(settings.openai);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(settings.anthropic);
        break;
      default:
        return { success: false, error: 'Unknown provider' };
    }

    const available = await provider.isAvailable();
    return { success: available, error: available ? undefined : 'Connection failed' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

console.log('ReadingBuddy service worker loaded');
