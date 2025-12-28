import { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { storage } from '../../utils/storage';

export async function getLLMProvider(): Promise<LLMProvider> {
  const settings = await storage.getSettings();

  switch (settings.provider) {
    case 'ollama':
      return new OllamaProvider(settings.ollama);
    case 'openai':
      return new OpenAIProvider(settings.openai);
    case 'anthropic':
      return new AnthropicProvider(settings.anthropic);
    default:
      return new OllamaProvider(settings.ollama);
  }
}

export { OllamaProvider } from './ollama';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export type { LLMProvider } from './types';
