import { LLMProvider, SYSTEM_PROMPT } from './types';
import { Message, PageContext } from '../../utils/messaging';

interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';
  private apiKey: string;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI error: ${error}`);
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
        const data = line.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') return;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
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
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    for (const msg of history.slice(1)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }
}
