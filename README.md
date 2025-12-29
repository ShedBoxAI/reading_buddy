# ReadingBuddy

<p align="center">
  <img src="assets/icons/icon128.png" alt="ReadingBuddy Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Your AI reading companion — highlight any text on the web for instant explanations.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#setup">Setup</a> •
  <a href="#local-llm-setup-ollama">Local LLM</a> •
  <a href="#development">Development</a>
</p>

---

## What is ReadingBuddy?

ReadingBuddy is a Chrome extension that lets you highlight any text on a webpage and get AI-powered explanations instantly. Whether you're reading technical documentation, academic papers, or blog posts, ReadingBuddy helps you understand complex concepts without leaving the page.

**Privacy-first**: Run with local models (Ollama) — your data never leaves your machine.

## Features

- **Instant Explanations** — Highlight text, click the bubble, get answers
- **Follow-up Questions** — Have a conversation about what you're reading
- **Multiple AI Providers** — Ollama (local), OpenAI, or Anthropic
- **Streaming Responses** — See answers as they're generated
- **Markdown Support** — Rich formatting in responses
- **Modern UI** — Clean glassmorphism design that doesn't get in your way
- **Enable/Disable Toggle** — Quickly turn off when you don't need it

## Installation

### From Source (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/ShedBoxAI/reading_buddy.git
   cd reading_buddy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

5. Complete the onboarding to configure your AI provider

### From Chrome Web Store

*Coming soon*

---

## Setup

ReadingBuddy supports three AI providers. Choose the one that fits your needs:

| Provider | Privacy | Cost | Speed | Setup Difficulty |
|----------|---------|------|-------|------------------|
| **Ollama (Local)** | Data stays local | Free | Depends on hardware | Medium |
| **OpenAI** | Data sent to OpenAI | Pay per use | Fast | Easy |
| **Anthropic** | Data sent to Anthropic | Pay per use | Fast | Easy |

---

## Local LLM Setup (Ollama)

Running a local LLM gives you complete privacy — your highlighted text and questions never leave your machine.

### Step 1: Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**

Download from [ollama.com/download](https://ollama.com/download)

### Step 2: Download a Model

Choose a model based on your hardware:

| Model | RAM Required | Best For |
|-------|--------------|----------|
| `llama3.2:3b` | 4GB | Lightweight, fast responses |
| `llama3.2:7b` | 8GB | Good balance of speed/quality |
| `mistral` | 8GB | Great for explanations |
| `qwen2.5:7b` | 8GB | Strong multilingual support |
| `llama3.1:70b` | 48GB+ | Best quality (needs beefy hardware) |

Download your chosen model:
```bash
ollama pull llama3.2:3b
```

### Step 3: Configure CORS for Chrome Extension

This is **required** for the Chrome extension to communicate with Ollama.

**macOS:**
```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
```

Then restart Ollama:
```bash
pkill ollama
ollama serve
```

**Linux:**
```bash
# Edit the systemd service
sudo systemctl edit ollama.service

# Add these lines:
[Service]
Environment="OLLAMA_ORIGINS=chrome-extension://*"

# Restart
sudo systemctl restart ollama
```

**Windows:**

Set environment variable `OLLAMA_ORIGINS` to `chrome-extension://*` in System Properties → Environment Variables, then restart Ollama.

### Step 4: Verify Ollama is Running

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return a list of your installed models
```

### Step 5: Configure ReadingBuddy

1. Click the ReadingBuddy icon in Chrome
2. Go to Settings (or complete onboarding if first time)
3. Select "Ollama" as provider
4. Host URL: `http://localhost:11434` (default)
5. Select your model from the dropdown
6. Click "Test Connection"

### Troubleshooting Ollama

**"Could not connect to Ollama"**
- Make sure Ollama is running: `ollama serve`
- Check if it's accessible: `curl http://localhost:11434/api/tags`

**"Forbidden" error**
- CORS is not configured. Follow Step 3 above.

**Slow responses**
- Try a smaller model (`llama3.2:3b` instead of `7b`)
- Close other applications to free up RAM
- Consider using GPU acceleration if available

**Custom port**
- If running Ollama on a different port, update the Host URL in settings

---

## OpenAI Setup

1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. In ReadingBuddy settings, select "OpenAI"
3. Paste your API key
4. Choose a model:
   - `gpt-4o-mini` — Fast and cheap (recommended)
   - `gpt-4o` — Most capable
   - `gpt-4-turbo` — Good balance
5. Test connection

## Anthropic Setup

1. Get an API key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. In ReadingBuddy settings, select "Anthropic"
3. Paste your API key
4. Choose a model:
   - `claude-sonnet-4-20250514` — Recommended
   - `claude-3-5-haiku-20241022` — Faster, cheaper
   - `claude-3-opus-20240229` — Most capable
5. Test connection

---

## Usage

1. **Highlight** any text on a webpage
2. **Click** the purple bubble that appears
3. **Read** the AI explanation
4. **Ask** follow-up questions in the chat input
5. Press **Escape** or click X to close

**Pro tips:**
- Click the extension icon to quickly enable/disable
- Works on any webpage (except Chrome internal pages)
- Larger text selections get more context-aware explanations

---

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Build (production)
npm run build

# Build (watch mode for development)
npm run watch
```

### Project Structure

```
reading-buddy/
├── src/
│   ├── background/       # Service worker & LLM providers
│   │   ├── llm/
│   │   │   ├── ollama.ts
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   └── types.ts
│   │   └── service-worker.ts
│   ├── content/          # Content script (selection & popup UI)
│   ├── options/          # Settings page
│   ├── popup/            # Extension popup
│   ├── onboarding/       # First-run setup
│   └── utils/            # Shared utilities
├── assets/               # Icons
├── dist/                 # Built extension (load this in Chrome)
└── manifest.json
```

### Tech Stack

- TypeScript
- Webpack
- Chrome Extension Manifest V3
- Streaming fetch for LLM responses

---

## Privacy

ReadingBuddy is designed with privacy in mind:

- **Local LLM (Ollama)**: All processing happens on your machine. No data is sent anywhere.
- **OpenAI/Anthropic**: Selected text and page context are sent to the respective API. See their privacy policies.
- **No analytics**: We don't collect any usage data.
- **No accounts**: No sign-up required.

See our full [Privacy Policy](PRIVACY.md).

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---
