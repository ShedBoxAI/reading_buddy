import { LLMProvider, SYSTEM_PROMPT } from './types';
import { Message, PageContext } from '../../utils/messaging';

interface OllamaConfig {
  host: string;
  model: string;
}

export class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  private host: string;
  private model: string;

  constructor(config: OllamaConfig) {
    this.host = config.host;
    this.model = config.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async *generateStream(
    context: PageContext,
    history: Message[]
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.buildMessages(context, history);

    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            yield json.message.content;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }

  private buildMessages(context: PageContext, history: Message[]) {
    const userPrompt = `I'm reading a webpage titled "${context.pageTitle}" (${context.pageUrl}).

I highlighted this text:
"${context.selectedText}"

Here's the surrounding context from the page:
${context.surroundingText}

Please explain what this highlighted text means in this context.`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    // Add conversation history (skip the first user message as we already included it)
    for (const msg of history.slice(1)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }
}
