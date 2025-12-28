import type { Message, PageContext, MessageType } from '../utils/messaging';
import './styles.css';

// State
let currentPopup: HTMLElement | null = null;
let triggerButton: HTMLElement | null = null;
let conversationHistory: Message[] = [];
let currentContext: PageContext | null = null;
let pendingContext: PageContext | null = null;
let pendingRect: DOMRect | null = null;
let isEnabled = true;

// Initialize
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('keydown', handleKeyDown);

// Check initial enabled state
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
  if (state) {
    isEnabled = state.enabled;
  }
});

// Listen for enabled state changes from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'ENABLED_CHANGED') {
    isEnabled = msg.enabled;
    if (!isEnabled) {
      // Clean up any existing UI
      triggerButton?.remove();
      triggerButton = null;
      closePopup();
    }
  }
});

function handleMouseUp(e: MouseEvent) {
  // Ignore if disabled
  if (!isEnabled) return;

  // Ignore if clicking inside our popup
  if (currentPopup?.contains(e.target as Node)) return;
  if (triggerButton?.contains(e.target as Node)) return;

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  // Remove existing trigger button
  triggerButton?.remove();
  triggerButton = null;

  if (selectedText && selectedText.length > 0) {
    showTriggerButton(selection!);
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closePopup();
  }
}

function showTriggerButton(selection: Selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Capture context NOW before selection is lost
  try {
    pendingContext = extractContext(selection);
    pendingRect = rect;
    console.log('Context captured:', pendingContext.selectedText);
  } catch (e) {
    console.error('Failed to extract context:', e);
  }

  triggerButton = document.createElement('div');
  triggerButton.id = 'reading-buddy-trigger';
  triggerButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a9 9 0 1 0 9 9"/>
      <path d="M12 7v4l2 2"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
    </svg>
  `;

  // Position near selection
  const top = rect.bottom + window.scrollY + 8;
  const left = rect.left + window.scrollX + rect.width / 2 - 18;

  triggerButton.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #8b5cf6, #a78bfa);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    color: white;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    animation: rb-trigger-in 0.2s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rb-trigger-in {
      from { opacity: 0; transform: scale(0.8) translateY(4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(style);

  triggerButton.addEventListener('mouseenter', () => {
    if (triggerButton) triggerButton.style.transform = 'scale(1.1)';
  });
  triggerButton.addEventListener('mouseleave', () => {
    if (triggerButton) triggerButton.style.transform = 'scale(1)';
  });

  triggerButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Button clicked, pendingContext:', pendingContext?.selectedText);

    if (pendingContext && pendingRect) {
      currentContext = pendingContext;
      conversationHistory = [];
      showPopup(pendingRect);
      requestExplanation();
    }
    triggerButton?.remove();
    triggerButton = null;
  });

  document.body.appendChild(triggerButton);
}

function extractContext(selection: Selection): PageContext {
  const selectedText = selection.toString().trim();
  let surroundingText = '';

  // Get surrounding text from parent elements
  const range = selection.getRangeAt(0);
  let container = range.commonAncestorContainer;

  // Find a block-level parent
  while (container && container.nodeType !== Node.ELEMENT_NODE) {
    container = container.parentNode!;
  }

  // Get text from nearby paragraphs
  const element = container as Element;
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    const start = Math.max(0, index - 1);
    const end = Math.min(siblings.length, index + 2);

    surroundingText = siblings
      .slice(start, end)
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 1500); // Limit context size
  }

  return {
    selectedText,
    surroundingText: surroundingText || selectedText,
    pageTitle: document.title,
    pageUrl: window.location.href,
  };
}

function showPopup(selectionRect: DOMRect) {
  closePopup(false); // Don't clear context when showing new popup

  currentPopup = document.createElement('div');
  currentPopup.id = 'reading-buddy-popup';

  // Calculate position
  let top = selectionRect.bottom + window.scrollY + 10;
  let left = selectionRect.left + window.scrollX;

  // Ensure popup doesn't go off-screen
  const popupWidth = 380;
  const popupMaxHeight = 450;

  if (left + popupWidth > window.innerWidth) {
    left = window.innerWidth - popupWidth - 20;
  }
  if (left < 10) left = 10;

  // If popup would go below viewport, show above selection
  if (top + popupMaxHeight > window.scrollY + window.innerHeight) {
    top = selectionRect.top + window.scrollY - popupMaxHeight - 10;
  }

  // Modern 2025 glassmorphism dark mode design
  currentPopup.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    width: ${popupWidth}px;
    max-height: ${popupMaxHeight}px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.05);
    z-index: 2147483647;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    color: #e2e8f0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: rb-popup-in 0.2s ease-out;
  `;

  currentPopup.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      @keyframes rb-popup-in {
        from { opacity: 0; transform: translateY(8px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #rb-input:focus {
        border-color: rgba(167, 139, 250, 0.5) !important;
        box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1) !important;
      }
      #rb-send:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      }
      #rb-close:hover {
        background: rgba(248, 113, 113, 0.2) !important;
      }
      #rb-messages::-webkit-scrollbar {
        width: 6px;
      }
      #rb-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      #rb-messages::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.3);
        border-radius: 3px;
      }
    </style>
    <div id="rb-header" style="
      padding: 14px 16px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(167, 139, 250, 0.1));
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #a78bfa, #8b5cf6);
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(167, 139, 250, 0.6);
        "></div>
        <span style="font-weight: 600; font-size: 13px; letter-spacing: -0.01em; color: #f1f5f9;">ReadingBuddy</span>
      </div>
      <button id="rb-close" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.15s ease;
      ">&times;</button>
    </div>
    <div id="rb-messages" style="
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      max-height: 300px;
    "></div>
    <div id="rb-input-area" style="
      padding: 12px 14px 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      display: flex;
      gap: 10px;
      background: rgba(15, 23, 42, 0.5);
    ">
      <input id="rb-input" type="text" placeholder="Ask anything..." style="
        flex: 1;
        padding: 10px 14px;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 10px;
        font-size: 13px;
        color: #e2e8f0;
        outline: none;
        transition: all 0.15s ease;
      "/>
      <button id="rb-send" style="
        padding: 10px 18px;
        background: linear-gradient(135deg, #8b5cf6, #a78bfa);
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        transition: all 0.15s ease;
      ">Send</button>
    </div>
  `;

  document.body.appendChild(currentPopup);

  // Event listeners
  currentPopup.querySelector('#rb-close')?.addEventListener('click', () => closePopup());
  currentPopup.querySelector('#rb-send')?.addEventListener('click', sendFollowUp);
  currentPopup.querySelector('#rb-input')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') sendFollowUp();
  });

  // Focus input
  (currentPopup.querySelector('#rb-input') as HTMLInputElement)?.focus();
}

function closePopup(clearContext = true) {
  currentPopup?.remove();
  currentPopup = null;
  conversationHistory = [];
  if (clearContext) {
    currentContext = null;
  }
}

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(139,92,246,0.2);color:#c4b5fd;padding:2px 6px;border-radius:4px;font-size:12px;font-family:\'SF Mono\',Monaco,monospace;">$1</code>')
    .replace(/\n/g, '<br>');
}

function appendMessage(role: 'user' | 'assistant', content: string) {
  const messagesDiv = currentPopup?.querySelector('#rb-messages');
  if (!messagesDiv) return;

  const isUser = role === 'user';
  const messageDiv = document.createElement('div');
  messageDiv.className = `rb-message rb-${role}`;
  messageDiv.style.cssText = `
    margin-bottom: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    max-width: 88%;
    font-size: 13px;
    line-height: 1.6;
    word-wrap: break-word;
    ${isUser
      ? 'margin-left: auto; background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: white;'
      : 'background: rgba(30, 41, 59, 0.6); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.1);'}
  `;
  messageDiv.innerHTML = isUser ? content : parseMarkdown(content);
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  return messageDiv;
}

function getLastAssistantMessage(): HTMLElement | null {
  const messagesDiv = currentPopup?.querySelector('#rb-messages');
  if (!messagesDiv) return null;
  return messagesDiv.querySelector('.rb-assistant:last-child');
}

function showLoading() {
  const messagesDiv = currentPopup?.querySelector('#rb-messages');
  if (!messagesDiv) return;

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'rb-loading';
  loadingDiv.style.cssText = `
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  loadingDiv.innerHTML = `
    <div class="rb-loading-pulse" style="
      display: flex;
      gap: 4px;
    ">
      <span style="width:6px;height:6px;background:#a78bfa;border-radius:50%;animation:rb-pulse 1.4s ease-in-out infinite;"></span>
      <span style="width:6px;height:6px;background:#a78bfa;border-radius:50%;animation:rb-pulse 1.4s ease-in-out 0.2s infinite;"></span>
      <span style="width:6px;height:6px;background:#a78bfa;border-radius:50%;animation:rb-pulse 1.4s ease-in-out 0.4s infinite;"></span>
    </div>
    <span style="color:#94a3b8;font-size:12px;">Thinking</span>
    <style>
      @keyframes rb-pulse {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
    </style>
  `;
  messagesDiv.appendChild(loadingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideLoading() {
  currentPopup?.querySelector('#rb-loading')?.remove();
}

function requestExplanation() {
  if (!currentContext) {
    console.log('No context!');
    console.trace('Call stack:');
    return;
  }

  console.log('Requesting explanation for:', currentContext.selectedText);
  showLoading();

  const port = chrome.runtime.connect({ name: 'reading-buddy-stream' });
  console.log('Port connected');
  let assistantMessage: HTMLElement | null = null;
  let fullContent = '';

  port.onMessage.addListener((msg: MessageType) => {
    if (msg.type === 'STREAM_CHUNK') {
      hideLoading();
      if (!assistantMessage) {
        assistantMessage = appendMessage('assistant', '') || null;
      }
      fullContent += msg.content;
      if (assistantMessage) {
        assistantMessage.innerHTML = parseMarkdown(fullContent);
      }
      // Scroll to bottom
      const messagesDiv = currentPopup?.querySelector('#rb-messages');
      if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    if (msg.type === 'STREAM_END') {
      // Final render with markdown
      if (assistantMessage) {
        assistantMessage.innerHTML = parseMarkdown(fullContent);
      }
      conversationHistory.push({ role: 'assistant', content: fullContent });
      port.disconnect();
    }

    if (msg.type === 'STREAM_ERROR') {
      hideLoading();
      appendMessage('assistant', `Error: ${msg.error}`);
      port.disconnect();
    }
  });

  port.postMessage({
    type: 'EXPLAIN_TEXT',
    payload: {
      context: currentContext,
      history: conversationHistory,
    },
  });
  console.log('Message sent to service worker');
}

function sendFollowUp() {
  const input = currentPopup?.querySelector('#rb-input') as HTMLInputElement;
  if (!input || !currentContext) return;

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Add user message to history and UI
  conversationHistory.push({ role: 'user', content: userMessage });
  appendMessage('user', userMessage);
  input.value = '';

  // Request response
  showLoading();

  const port = chrome.runtime.connect({ name: 'reading-buddy-stream' });
  let assistantMessage: HTMLElement | null = null;
  let fullContent = '';

  port.onMessage.addListener((msg: MessageType) => {
    if (msg.type === 'STREAM_CHUNK') {
      hideLoading();
      if (!assistantMessage) {
        assistantMessage = appendMessage('assistant', '') || null;
      }
      fullContent += msg.content;
      if (assistantMessage) {
        assistantMessage.innerHTML = parseMarkdown(fullContent);
      }
      const messagesDiv = currentPopup?.querySelector('#rb-messages');
      if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    if (msg.type === 'STREAM_END') {
      if (assistantMessage) {
        assistantMessage.innerHTML = parseMarkdown(fullContent);
      }
      conversationHistory.push({ role: 'assistant', content: fullContent });
      port.disconnect();
    }

    if (msg.type === 'STREAM_ERROR') {
      hideLoading();
      appendMessage('assistant', `Error: ${msg.error}`);
      port.disconnect();
    }
  });

  port.postMessage({
    type: 'EXPLAIN_TEXT',
    payload: {
      context: currentContext,
      history: conversationHistory,
    },
  });
}

console.log('ReadingBuddy content script loaded');
