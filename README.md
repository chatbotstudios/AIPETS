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
- **SSE (Server-Sent Events)** for instant browser push from any AI agent
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

### GET `/api/sse`

EventSource stream for real-time browser push:

```javascript
const es = new EventSource('/api/sse');
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────┐
│  Remote Agents (Hermes/Discord/TG)  │
│  post_llm_call shell hook           │
│  → curl POST /api/pulse             │
└──────────────┬──────────────────────┘
               │ via Tailscale / LAN
               ▼
┌─────────────────────────────────────┐
│  AIPETS (Next.js :3000)            │
│  /api/pulse → SSE Broker           │
│  /api/sse  → Browser EventSource   │
│  → Physical Buddy auto-relay       │
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

## 🔧 Hermes Agent Integration

To connect a remote [Hermes Agent](https://github.com/chatbotstudios), add a shell hook:

**1. Create the hook script:**
```bash
# ~/.hermes/agent-hooks/buddy-pulse.sh
#!/usr/bin/env bash
payload="$(cat -)"
response=$(echo "$payload" | jq -r '.extra.response_text // "activity"' 2>/dev/null)
BUDDY_URL="${BUDDY_URL:-http://<YOUR_MAC_IP>:3000/api/pulse}"
curl -s -X POST "$BUDDY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"success\", \"model\": \"Hermes Agent\", \"text\": \"$(echo "$response" | head -c 200)\", \"source\": \"hermes\"}" \
  --connect-timeout 3 >/dev/null 2>&1 &
printf '{}\n'
```

**2. Register in `~/.hermes/config.yaml`:**
```yaml
hooks:
  post_llm_call:
    - command: ~/.hermes/agent-hooks/buddy-pulse.sh
      timeout: 10
hooks_auto_accept: true
```

**3. Restart the gateway:**
```bash
hermes gateway restart
```

---

## 📋 Version History

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
