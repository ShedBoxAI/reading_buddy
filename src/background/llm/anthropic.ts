import { LLMProvider, SYSTEM_PROMPT } from './types';
import { Message, PageContext } from '../../utils/messaging';

interface AnthropicConfig {
  apiKey: string;
  model: string;
}

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic';
  private apiKey: string;
  private model: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *generateStream(
    context: PageContext,
    history: Message[]
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.buildMessages(context, history);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        try {
          const json = JSON.parse(data);
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield json.delta.text;
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

    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: userPrompt },
    ];

    for (const msg of history.slice(1)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }
}
