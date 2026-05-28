# 🐾 AIPETS — AI Pet Swarm HUD

> A cyberpunk Tamagotchi-style AI companion HUD that reacts in real-time to your AI agents via braille matrix animations, particle effects, and telemetry pulses.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 🧬 Braille & Dot Matrix Animations
- **5×8 procedural braille matrix** with 7 unique animation modes per state
- **Wave**, **Random Neural Noise**, **Cascade Fill**, **Spiral**, **Rain**, **Breathe**, and **Static** patterns
- Per-state color palettes with dual-tone neon text shadows
- 60 FPS render loop using direct DOM refs (zero React re-render overhead)

### ⚡ Real-Time Agent Telemetry
- **Vercel-Compatible Short-Polling** for instant browser updates across serverless environments
- **Hermes Agent hook** — auto-pulses on every LLM response via Discord/Telegram
- Source badges show which platform triggered the reaction (⚡ HERMES, 🎮 DISCORD, ✈️ TELEGRAM)
- Per-state screen glow animations (cyan, purple, yellow, green, red)

### 🎮 Tamagotchi Game Engine
- XP, Leveling, HP decay/regen, Trust REP system
- Class evolution tree: Cyber-Egg → Script Kiddie → Packet Sniffer → ...
- Swarm mesh peer simulation (ESP-NOW style)
- Diagnostic action registry (Passive Scan, Process Intel, Neural Sync, Dream Loop)

### 🔌 Physical Buddy Sync
- Auto-relay pulses to ESP32 AMOLED hardware companion
- Configurable via `BUDDY_IP` environment variable
- Real-time state mirroring between web HUD and physical device

### 🧠 Multi-Provider Neural Core
- Direct browser API calls to **Gemini**, **OpenAI**, **xAI Grok**, **DeepSeek**
- Gateway proxy mode for **Anthropic Claude** and LiteLLM
- Upload `.env` or JSON config files to bulk-import API keys

---

## 🚀 Quick Start & Setup Instructions

```bash
# Clone the repository
git clone https://github.com/chatbotstudios/AIPETS.git
cd AIPETS

# Install dependencies
npm install
```

### ⚙️ Configuration (.env)

Create a `.env.local` or `.env` file in the project root to configure your AI Providers and Alert Notification Channels. All keys are optional but highly recommended to unlock the full potential of your AIPET.

```env
# --- 🔑 AI Provider API Keys ---
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key
GROK_API_KEY=your_xai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# --- 📢 Alert Notification Channels ---
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
DISCORD_USER_ID=your_discord_user_id

# --- 🕵️ Agent Resources ---
AGENT_GITHUB_PAT=your_github_pat
BRAVE_SEARCH_API=your_brave_search_api

# --- 🔌 Physical Buddy Sync (Optional) ---
BUDDY_IP=192.168.1.13
```

### 🏃 Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and complete the onboarding wizard.

---

## 📡 Telemetry API

### POST `/api/pulse`

Send a telemetry pulse to trigger HUD animations:

```bash
curl -X POST http://localhost:3000/api/pulse \
  -H "Content-Type: application/json" \
  -d '{"status":"thinking","model":"Hermes Agent","text":"Processing...","source":"hermes"}'
```

| Field | Type | Values |
|-------|------|--------|
| `status` | string | `idle`, `connecting`, `thinking`, `tool_calls`, `success`, `error` |
| `model` | string | Agent/model name displayed in HUD |
| `text` | string | Response text or status message |
| `source` | string | `hermes`, `discord`, `telegram`, `direct`, `cyberspace` |
| `tokens` | number | Token count (triggers XP gain on success) |

### GET `/api/pulse` (Browser Polling)

Fetch the latest event state (designed specifically to support Vercel Serverless isolation):

```javascript
// Poll every 2 seconds for fresh pulses
const res = await fetch(`/api/pulse?after=${lastTimestamp}`);
if (res.status === 200) {
  const pulse = await res.json();
  console.log("New Pulse:", pulse);
}
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────┐
│  Remote Agents (Hermes/OpenClaw)    │
│  Native Transport Hooks             │
│  → POST /api/pulse                  │
└──────────────┬──────────────────────┘
               │ via Cyberspace
               ▼
┌─────────────────────────────────────┐
│  AIPETS (Vercel Serverless)         │
│  /api/pulse (POST) → Global Store   │
│  /api/pulse (GET)  ← Browser Poll   │
│  → Physical Buddy auto-relay        │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
 Browser HUD         ESP32 Buddy
 (Braille Matrix)    (AMOLED Display)
```

---

## 📂 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── pulse/route.ts      # Telemetry pulse ingestion
│   │   ├── sse/route.ts        # SSE stream for browsers
│   │   ├── buddy-pulse/route.ts # ESP32 physical relay
│   │   └── proxy/route.ts      # LiteLLM gateway proxy
│   ├── globals.css             # Design system + braille animations
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main app entry
├── components/
│   └── hud/
│       ├── AIPETHUD.tsx        # Main HUD component (1500+ lines)
│       └── OnboardingWizard.tsx # First-run setup wizard
└── lib/
    ├── store.ts                # Zustand state management
    ├── game-engine.ts          # XP/Level/Evolution engine
    ├── audio-synth.ts          # Web Audio API synth
    └── sse-broker.ts           # Server-side SSE broadcaster
```

---

## 🔧 Autonomous Agent Integration

To seamlessly link your autonomous VPS agents to your live dashboard, export the dashboard URL in your agent's environment, and patch its streaming transport.

### 1. Environment Configuration
On your agent's machine (e.g., your DigitalOcean VPS), set your Vercel deployment URL globally or in the `.env`:
```bash
export AIPETS_DASHBOARD_URL="https://aipets-brown.vercel.app"
```

### 2. Hermes / Python Agent Hook
Drop the `aipets_emitter.py` utility into your agent core to automatically wrap OpenAI/LiteLLM completions:
```python
from aipets_emitter import aipets_emit

aipets_emit("connecting", "Initializing uplink...")
# ... execute LLM call
aipets_emit("success", result_text, total_tokens)
```

### 3. OpenClaw / JS Agent Hook
For OpenClaw, intercept the raw provider stream (e.g., `transport-stream.js`) to stream real-time events to the HUD during long-running tasks:
```javascript
const aipetsEmit = (status, text, tokens, tools) => {
  fetch(`${process.env.AIPETS_DASHBOARD_URL}/api/pulse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, text, tokens, tools, source: "openclaw" })
  }).catch(() => {});
};

aipetsEmit("thinking", "Thinking...", undefined, "web_search");
```

---

## 🌐 Universal Agent Telemetry (LiteLLM)

You can easily route **any Python Agent** (LangChain, Cursor, Autogen, custom scripts) to automatically emit real-time visual telemetry to your HUD.

### Method 1: The Local Proxy Drop-in (Easiest)
Deploy this Next.js app to Vercel or run it locally, then point your agent's API base to the proxy endpoint. The proxy will seamlessly intercept the calls, trigger the HUD animations, and forward the completions payload to your actual LLM provider!

```python
import litellm

# 1. Point LiteLLM to your AIPETS Proxy 
litellm.api_base = "https://your-aipets.vercel.app/api/proxy" 
# (Or http://localhost:3000/api/proxy)

# 2. Add your API Keys in the AIPETS UI or Vercel Environment Variables
# 3. Every LLM call will now trigger the Braille matrix and glow effects instantly!
```

### Method 2: Python Callback Logger
If you prefer not to proxy your traffic, use our native LiteLLM callback script:

1. Copy `connectors/aipet_litellm_callback.py` into your agent project.
2. Register the callback:
```python
import litellm
from aipet_litellm_callback import AIPETCallback

# Register the callback to point to your live HUD
litellm.callbacks = [AIPETCallback(pulse_url="https://your-aipets.vercel.app/api/pulse")]
```

---

## 📋 Version History

### v2.0.1 — Vercel Serverless Telemetry (2026-05-28)
- 📡 **Vercel Polling Engine**: Migrated from SSE to a robust 2s polling store to natively support Vercel serverless execution bounds.
- 🔧 **Deep Agent Integration**: Hot-patched OpenClaw's Google/Gemini transports and Hermes' OpenAI transports to natively emit real-time stream status to the dashboard.
- 🔍 **Brave Search Telemetry Integration**: Dashboard cyberspace routines directly tap into `.env` Brave keys.

### v2.0.0 — Braille Matrix Overhaul (2026-05-28)
- 🧬 **5-row × 8-column braille matrix** (up from 3×6)
- 🎨 **7 procedural animation modes**: wave, random, cascade, spiral, rain, breathe, static
- 🌈 **Per-state color glow animations** with dual-tone neon shadows
- ⚡ **Pulse source badges** — shows ⚡ HERMES, 🎮 DISCORD, ✈️ TELEGRAM origin
- 🔗 **Hermes shell hook integration** — auto-pulse on every LLM response
- 📡 **Remote agent support** via Tailscale VPN mesh

### v1.0.0 — Initial Release (2026-05-27)
- 🐾 Tamagotchi-style AI companion HUD
- 📊 XP/Level/HP/REP vital metrics with animated progress bars
- 🎮 Diagnostic action registry (Passive Scan, Intel Capture, Neural Sync, Dream Loop)
- 🌐 Swarm mesh peer simulation
- 🧠 Multi-provider Neural Core (Gemini, OpenAI, Anthropic, xAI, DeepSeek)
- 🔌 Physical ESP32 Buddy sync via `/api/buddy-pulse`
- 📡 SSE telemetry proxy for real-time browser push
- 🎵 Web Audio API sound effects (success arpeggio, error warning, spacey chime)
- ⚙️ Settings modal with `.env` file upload parser
- 🎨 Glassmorphic dark UI with CRT scanline overlay

---

## 📄 License

MIT — Built by [ChatbotStudios](https://github.com/chatbotstudios)
