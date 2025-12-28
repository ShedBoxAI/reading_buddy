export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface PageContext {
  selectedText: string;
  surroundingText: string;
  pageTitle: string;
  pageUrl: string;
}

export type MessageType =
  | { type: 'EXPLAIN_TEXT'; payload: { context: PageContext; history: Message[] } }
  | { type: 'STREAM_CHUNK'; content: string }
  | { type: 'STREAM_END' }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'GET_STATE' }
  | { type: 'TEST_CONNECTION'; provider: string }
  | { type: 'ENABLED_CHANGED'; enabled: boolean };
