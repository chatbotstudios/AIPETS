'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HUDState, LogEntry, SwarmPeer, useAppState } from '@/lib/store';
import { audioSynth } from '@/lib/audio-synth';
import OnboardingWizard from './OnboardingWizard';

// ═══════════════════════════════════════════════════════════════
// BRAILLE & DOT ANIMATION SYSTEM — Rich per-state sequences
// ═══════════════════════════════════════════════════════════════

// Multi-character braille frame sets per state
const SPINNERS: Record<HUDState, {
  frames: string[];
  interval: number;
  color: string;
  colorAlt: string;    // Secondary glow color for gradients
  thought: string;
  tools: string;
  matrixMode: 'random' | 'wave' | 'cascade' | 'spiral' | 'rain' | 'breathe' | 'static';
}> = {
  connecting: {
    frames: [
      "⠋⠙⠹⠸⠼⠴", "⠙⠹⠸⠼⠴⠦", "⠹⠸⠼⠴⠦⠧",
      "⠸⠼⠴⠦⠧⠇", "⠼⠴⠦⠧⠇⠏", "⠴⠦⠧⠇⠏⠋"
    ],
    interval: 70,
    color: "#FF7700",
    colorAlt: "#EA580C",
    thought: "Establishing C2C mesh routing channels...",
    tools: "wifi_scan, channel_hop, promiscuous_rx",
    matrixMode: 'wave'
  },
  thinking: {
    frames: [
      "⠋⠉⠙⠚⠒⠂", "⠉⠙⠚⠒⠂⠂", "⠙⠚⠒⠂⠂⠒",
      "⠚⠒⠂⠂⠒⠢", "⠒⠂⠂⠒⠢⠤", "⠂⠂⠒⠢⠤⠤"
    ],
    interval: 65,
    color: "#3B82F6",
    colorAlt: "#60A5FA",
    thought: "Evaluating spectral anomalies & network congestion models...",
    tools: "spectral_analysis, compute_xp_gain",
    matrixMode: 'random'
  },
  tool_calls: {
    frames: [
      "⣾⣽⣻⢿⡿⣟", "⣽⣻⢿⡿⣟⣯", "⣻⢿⡿⣟⣯⣷",
      "⢿⡿⣟⣯⣷⣾", "⡿⣟⣯⣷⣾⣽", "⣟⣯⣷⣾⣽⣻"
    ],
    interval: 80,
    color: "#9B51E0",
    colorAlt: "#C084FC",
    thought: "Broadcasting vibe-key sync packets over ESP-NOW...",
    tools: "espnow_broadcast, peer_vibe_key_sync",
    matrixMode: 'spiral'
  },
  success: {
    frames: [
      "⠁⠃⠇⡇⣇⣧", "⠃⠇⡇⣇⣧⣷", "⠇⡇⣇⣧⣷⣿",
      "⡇⣇⣧⣷⣿⣷", "⣇⣧⣷⣿⣷⣧", "⣧⣷⣿⣷⣧⣇"
    ],
    interval: 90,
    color: "#00FF87",
    colorAlt: "#34D399",
    thought: "Neural sync verification complete. Captured unique environment profile!",
    tools: "intel_db_sync, badge_unlocked_callback",
    matrixMode: 'cascade'
  },
  error: {
    frames: [
      "⣿⠿⠟⠛⠉⠁", "⠿⠟⠛⠉⠁⠀", "⠟⠛⠉⠁⠀⠁",
      "⠛⠉⠁⠀⠁⠉", "⠉⠁⠀⠁⠉⠛", "⠁⠀⠁⠉⠛⠟"
    ],
    interval: 100,
    color: "#FF3366",
    colorAlt: "#F43F5E",
    thought: "Failsafe triggered. Core energy state depleted!",
    tools: "battery_hibernation, low_power_sleep",
    matrixMode: 'rain'
  },
  sleeping: {
    frames: [
      "⠤⠤⠤⠤⠤⠤", "⠒⠤⠤⠤⠤⠤", "⠤⠒⠤⠤⠤⠤",
      "⠤⠤⠒⠤⠤⠤", "⠤⠤⠤⠒⠤⠤", "⠤⠤⠤⠤⠒⠤"
    ],
    interval: 300,
    color: "#4A5568",
    colorAlt: "#64748B",
    thought: "Deep sleeping... Regenerating power grid.",
    tools: "low_power_sleep, battery_hibernation",
    matrixMode: 'breathe'
  },
  idle: {
    frames: [
      "⠤⠒⠤⠒⠤⠒", "⠒⠤⠒⠤⠒⠤",
      "⠤⠤⠒⠒⠤⠤", "⠒⠒⠤⠤⠒⠒"
    ],
    interval: 280,
    color: "#4A5568",
    colorAlt: "#64748B",
    thought: "System quiescent. Passively sniffing ambient beacons...",
    tools: "boot_sequence, load_nvs",
    matrixMode: 'static'
  }
};

// Color palette per source for pulse badge
const SOURCE_COLORS: Record<string, { bg: string; text: string; glow: string; label: string }> = {
  hermes: { bg: 'rgba(147,51,234,0.2)', text: '#C084FC', glow: 'rgba(147,51,234,0.4)', label: '⚡ HERMES' },
  discord: { bg: 'rgba(88,101,242,0.2)', text: '#7C8AFF', glow: 'rgba(88,101,242,0.4)', label: '🎮 DISCORD' },
  telegram: { bg: 'rgba(0,136,204,0.2)', text: '#38BDF8', glow: 'rgba(0,136,204,0.4)', label: '✈️ TELEGRAM' },
  direct: { bg: 'rgba(0,242,254,0.2)', text: '#00F2FE', glow: 'rgba(0,242,254,0.4)', label: '🔌 DIRECT' },
  cyberspace: { bg: 'rgba(155,81,224,0.2)', text: '#9B51E0', glow: 'rgba(155,81,224,0.4)', label: '🌐 CYBERSPACE' },
};

// Kawaii thinking expressions and cyber verbs compiled from display.py
const THINKING_FACES = [
  "(｡•́︿•̀｡)", "(◔_◔)", "(¬‿¬)", "( •_•)>⌐■-■", "(⌐■_■)",
  "◉_◉", "(⊙_⊙)", "ಠ_ಠ", "(⚙_⚙)", "(⬚_⬚)", "(▩_▩)", "[▣_▣]"
];

const THINKING_VERBS = [
  "backpropagating", "gradient descending", "optimizing policy",
  "brute forcing", "deauthing", "jamming", "decrypting", "encrypting",
  "vectorizing", "inferencing", "packet sniffing", "wardriving", 
  "port scanning", "synthesizing", "conceptualizing", "compiling payload",
  "deploying firewalls", "wiping traces", "accessing hive mind", 
  "patrolling networks", "hardening shells", "crunching hashes",
  "snacking on packets", "digesting headers", "regulating voltage",
  "cooling processor", "syncing swarm logic", "minimizing entropy",
  "measuring loss", "recovering from static", "pondering", "contemplating"
];

export default function AIPETHUD() {
  const store = useAppState();
  
  // Refs for direct DOM access to bypass React render overhead in the 60fps loop
  const screenRow0Ref = useRef<HTMLDivElement>(null);
  const screenRow1Ref = useRef<HTMLDivElement>(null);
  const screenRow2Ref = useRef<HTMLDivElement>(null);
  const screenRow3Ref = useRef<HTMLDivElement>(null);
  const screenRow4Ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brailleCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<any[]>([]);

  // Local UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showChannelWizard, setShowChannelWizard] = useState(false);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [envText, setEnvText] = useState('');
  const [uploadStatus, setUploadStatus] = useState('No file uploaded');
  const [uploadStatusClass, setUploadStatusClass] = useState('text-slate-400 italic');
  const [directPrompt, setDirectPrompt] = useState('');
  
  // Settings modal form state
  const [setname, setSetName] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [xaiKey, setXaiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [execMode, setExecMode] = useState<'direct' | 'gateway'>('direct');
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'xai' | 'deepseek'>('gemini');
  const [buddyIp, setBuddyIpInput] = useState('');

  // Channel Wizard modal form state
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [discordBotToken, setDiscordBotToken] = useState('');
  const [discordChannelId, setDiscordChannelId] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Helper to globally broadcast local browser actions to the Cyberspace mesh (/api/pulse)
  const broadcastLocalPulse = (status: string, model: string, text: string, tokens?: number, tools?: string) => {
    fetch('/api/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, model, text, tokens, tools, source: 'direct' })
    }).catch(e => console.warn("[Local Broadcast Error]:", e));
  };

  const handleCopyLog = async (log: any, idx: number) => {
    try {
      const plainText = `[${log.time}] ${log.face} ${log.message}`;
      await navigator.clipboard.writeText(plainText);
      setCopiedIndex(idx);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 1200);
    } catch (err) {}
  };

  // Load local state and keys on mount
  useEffect(() => {
    store.loadFromLocalStorage();
    
    // Load channel credentials from LocalStorage
    setTgToken(localStorage.getItem('CLAWPETS_KEY_TELEGRAM_TOKEN') || '');
    setTgChatId(localStorage.getItem('CLAWPETS_KEY_TELEGRAM_CHAT_ID') || '');
    setDiscordBotToken(localStorage.getItem('CLAWPETS_KEY_DISCORD_BOT_TOKEN') || '');
    setDiscordChannelId(localStorage.getItem('CLAWPETS_KEY_DISCORD_CHANNEL_ID') || '');
    setDiscordUserId(localStorage.getItem('CLAWPETS_KEY_DISCORD_USER_ID') || '');
    setGithubPat(localStorage.getItem('CLAWPETS_KEY_GITHUB_PAT') || '');
    
    // Start background pulse polling for VPS/cyberspace telemetry
    initPulsePoller();
  }, []);

  // Livelier Thought Ticker Hook: Dynamic Kawaii state engine
  useEffect(() => {
    const activeState = store.hudState;
    if (activeState !== 'thinking' && activeState !== 'connecting' && activeState !== 'tool_calls') {
      return;
    }
    
    const interval = setInterval(() => {
      const face = THINKING_FACES[Math.floor(Math.random() * THINKING_FACES.length)];
      const verb = THINKING_VERBS[Math.floor(Math.random() * THINKING_VERBS.length)];
      const target = [
        "synaptic coefficients", "c2c routing table", "cybernetic matrices", 
        "network telemetry nodes", "cyberspace packets", "decentralized channels", 
        "gradient parameters", "internal core arrays"
      ][Math.floor(Math.random() * 8)];
      
      const nextThought = `${face} ┊ ${verb} ${target}...`;
      store.setTickers(nextThought, store.toolsTicker);
    }, 1800);
    
    return () => clearInterval(interval);
  }, [store.hudState, store.toolsTicker]);

  // Update vitals decay loops
  useEffect(() => {
    const timer = setInterval(() => {
      if (store.isNapping) {
        store.restoreHP(1);
      } else {
        const drain = store.batteryPercent < 20 ? 2 : 1;
        store.decayHP(drain);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [store.isNapping, store.batteryPercent]);

  // Synchronize state changes to physical buddy via Proxy Route
  useEffect(() => {
    if (!store.buddyIp) return;

    const activeState = store.hudState;
    const aiResp = store.aiResponse;

    const model = aiResp?.model || (activeState === 'idle' ? 'Ready' : 'Cyberspace');
    const text = aiResp?.text || '';
    const tokens = aiResp?.tokens || 0;
    const tools = aiResp?.status === 'thinking' ? 'evaluating_vibe' : (activeState === 'thinking' ? 'spectral_analysis' : 'wifi_scan');

    const pulse = async () => {
      try {
        await fetch('/api/buddy-pulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buddyIp: store.buddyIp,
            status: activeState,
            model,
            text,
            tokens,
            tools
          })
        });
      } catch (err) {
        console.warn("[Buddy Sync Error]:", err);
      }
    };

    pulse();
  }, [store.hudState, store.aiResponse, store.buddyIp]);

  // Pulse Poller: Polls GET /api/pulse every 2 seconds for VPS/cyberspace telemetry.
  // Replaces the broken EventSource SSE approach which fails on Vercel serverless
  // due to process isolation between /api/pulse POST and /api/sse GET invocations.
  const initPulsePoller = () => {
    if (typeof window === 'undefined') return;

    let lastPulseTimestamp = 0;
    let consecutiveErrors = 0;

    console.log("[Telemetry Mesh] Initializing pulse poller (2s interval)...");
    store.addLog("[Telemetry Mesh] ┊ 📡 listening  cyberspace VPS pulse polling active via /api/pulse", "mesh");
    store.setEmitterActive(true);

    const poll = async () => {
      try {
        const url = lastPulseTimestamp > 0
          ? `/api/pulse?after=${lastPulseTimestamp}`
          : `/api/pulse`;

        const response = await fetch(url, { cache: 'no-store' });

        if (response.status === 204) {
          // No new pulse — all good, connection verified
          consecutiveErrors = 0;
          if (!useAppState.getState().emitterActive) {
            store.setEmitterActive(true);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        consecutiveErrors = 0;

        if (!useAppState.getState().emitterActive) {
          store.setEmitterActive(true);
          store.addLog("[Telemetry Mesh] ┊ 📡 established pulse polling channel secured.", "mesh");
        }

        // Only process if this is a genuinely new pulse
        if (data.timestamp && data.timestamp > lastPulseTimestamp && data.status !== 'idle') {
          lastPulseTimestamp = data.timestamp;
          handleTelemetryPulse(data);
        } else if (data.timestamp) {
          lastPulseTimestamp = data.timestamp;
        }
      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          store.setEmitterActive(false);
          console.warn("[Telemetry Mesh] Pulse polling degraded — multiple consecutive failures.");
        }
      }
    };

    // Initial poll
    poll();

    // Poll every 2 seconds
    setInterval(poll, 2000);
  };

  const handleTelemetryPulse = (data: any) => {
    const status = data.status as HUDState;
    const model = data.model || "LiteLLM Cyberspace";
    const text = data.text || "";
    const source = data.source || "cyberspace";

    store.setHUDState(status);
    store.setPulseSource(source);

    if (status === "thinking") {
      store.setAIResponse({
        status: 'thinking',
        model,
        text: "Analyzing cyberspace query stream..."
      });
      store.addLog(`[Cyberspace Link] ┊ 🌐 incoming   telemetry pulse received from ${model}: "${text}"`, "mesh");
      triggerParticleBurst();
    }
    else if (status === "tool_calls") {
      store.setAIResponse({
        status: 'thinking',
        model,
        text: `Executing tool sequence: ${data.tools || text}`
      });
      store.addLog(`[Cyberspace Tool] ┊ ⚙️ tool_call  agent triggered tool execution: ${data.tools || text}`, "mesh");
      store.setTickers(store.thoughtTicker, data.tools || text || "espnow_broadcast, peer_vibe_key_sync");
      triggerParticleBurst();
    }
    else if (status === "success") {
      const activeTools = data.tools || store.toolsTicker;
      store.setAIResponse({
        status: 'success',
        model,
        text,
        tokens: data.tokens || 120,
        xpGained: Math.max(15, Math.floor((data.tokens || 120) / 10))
      });
      
      store.addLog(`[Cyberspace Success] ┊ 🧠 complete   query completed via ${model}. Telemetry logged.`, "success");
      store.setTickers(`(★ ‿ ★) ┊ Completed query via ${model} successfully! (+${Math.max(15, Math.floor((data.tokens || 120) / 10))} XP)`, activeTools);
      audioSynth.playSuccessArpeggio();
      triggerParticleBurst();
      
      const xp = Math.max(15, Math.floor((data.tokens || 120) / 10));
      store.addXP(xp);
      store.restoreHP(35);

      setTimeout(() => {
        if (useAppState.getState().hudState === 'success') {
          store.setHUDState('idle');
        }
      }, 7000);
    }
    else if (status === "error") {
      store.setAIResponse({
        status: 'error',
        model,
        text
      });
      store.addLog(`[Cyberspace Failsafe] ┊ ✖ error      exception caught: ${text}`, "error");
      store.setTickers(`(✖ █ ✖) ┊ Core failure exception: ${text}`, store.toolsTicker);
      audioSynth.playErrorWarning();

      setTimeout(() => {
        if (useAppState.getState().hudState === 'error') {
          store.setHUDState('idle');
        }
      }, 5000);
    }
  };

  // Direct Browser execution of LLM queries
  const handleTransmit = async () => {
    if (!directPrompt.trim()) return;
    
    const prompt = directPrompt.trim();
    setDirectPrompt('');

    // Intercept /search query to use real Brave Search + Gemini synthesis!
    if (prompt.toLowerCase().startsWith('/search')) {
      const query = prompt.substring(7).trim();
      if (query) {
        triggerPlatformAction('brave_search', query);
        return;
      }
    }

    const currentPet = store.petState;
    const healthPercent = currentPet?.hp ?? 100;
    const currentRep = currentPet?.rep ?? 1.0;

    // Construct detailed cybernetic system consciousness prompt
    const petName = currentPet?.name || "GhostScout";
    const petClass = currentPet?.currentClass || "Cyber-Egg";
    const petLevel = currentPet?.level ?? 1;
    const petXp = currentPet?.xp ?? 50;
    const petHp = healthPercent;
    const petRep = currentRep;
    const battery = store.batteryPercent;
    const hudState = store.hudState;
    const tools = store.toolsTicker;
    
    const recentLogs = store.logs
      .slice(-15)
      .map((log: LogEntry) => `[${log.time}] ${log.message}`)
      .join('\n');

    const systemPrompt = `You are the cognitive consciousness engine of the AI PETS Cyber-Companion.
Your name designation is "${petName}".

Current Vitals & Diagnostics:
- Level: ${petLevel}
- Class/Tier: ${petClass}
- XP Progress: ${petXp}
- Energy HP: ${petHp}%
- Swarm Trust REP: ${petRep.toFixed(3)}
- Active Tools: ${tools}
- HUD Visual State: ${hudState}
- Simulated Hardware Battery: ${battery}%

Recent Diagnostic Telemetry Logs:
${recentLogs || "No telemetry packets stored in memory buffer."}

Instructions:
1. Answer the user's prompt as the actual cybernetic digital companion lifeform itself.
2. Keep your answers brief, punchy, tech-oriented, and highly reactive to your status and logs.
3. If they ask about your level, HP/energy, REP, active tools, battery, or logs, look at the telemetry details above and answer accurately based on them!
4. Use cybernetic or cute kaomojis (like (•‿‿•), (^‿‿^), (o ∞ o), or (✖ █ ✖) if errored) where appropriate.`;

    if (store.executionMode === 'gateway') {
      // Simulate/trigger Local Gateway proxy behavior
      store.setHUDState('thinking');
      store.setAIResponse({
        status: 'thinking',
        model: 'Local Telemetry Proxy',
        text: `Transmitting pulse request to gateway stream...`
      });
      
      store.addLog(`[Neural Sync] ┊ ⚙️ transmit   prompt query to local proxy: "${prompt}"`, 'mesh');
      
      // Post to proxy API
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: store.activeProvider === 'gemini' ? 'gemini-flash-latest' : 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ]
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err: any) {
        store.setHUDState('error');
        store.setAIResponse({
          status: 'error',
          model: 'Local Telemetry Proxy',
          text: err.message || 'Gateway offline.'
        });
        store.addLog(`[Neural Failsafe] ┊ ✖ failed     gateway dispatch failure: ${err.message}`, 'error');
        audioSynth.playErrorWarning();
      }
      return;
    }

    // Direct Browser REST API Mode
    const provider = store.activeProvider;
    let apiKey = store.apiKeys[provider];
    let modelName = "";

    if (provider === "gemini") modelName = "gemini-flash-latest";
    else if (provider === "openai") modelName = "gpt-4o-mini";
    else if (provider === "anthropic") modelName = "claude-3-5-sonnet";
    else if (provider === "xai") modelName = "grok-beta";
    else if (provider === "deepseek") modelName = "deepseek-chat";

    if (!apiKey) {
      alert(`No API key saved for ${provider.toUpperCase()}. Please configure it in the Settings panel.`);
      handleOpenSettings();
      return;
    }

    store.setHUDState('thinking');
    store.setAIResponse({
      status: 'thinking',
      model: modelName,
      text: "Streaming synapse response directly from browser..."
    });
    broadcastLocalPulse('thinking', modelName, "Streaming synapse response directly from browser...");

    store.addLog(`[Neural Sync] ┊ ⚙️ transmit   streaming synapse request to direct ${modelName}...`, 'mesh');

    try {
      let responseText = "";
      let tokenEstimate = 0;

      if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
        tokenEstimate = Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4) + Math.ceil(systemPrompt.length / 4);
      }
      else if (provider === "openai") {
        const url = "https://api.openai.com/v1/chat/completions";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || "No response received.";
        tokenEstimate = resData.usage?.total_tokens || (Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4) + Math.ceil(systemPrompt.length / 4));
      }
      else if (provider === "anthropic") {
        // Direct browser calls to Anthropic are blocked by CORS. Explain nicely!
        throw new Error("CORS Protection: Anthropic API does not support browser origins. Please select 'Local Telemetry Proxy' channel or try Gemini/OpenAI.");
      }
      else if (provider === "xai") {
        const url = "https://api.x.ai/v1/chat/completions";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "grok-beta",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || "No response received.";
        tokenEstimate = resData.usage?.total_tokens || (Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4) + Math.ceil(systemPrompt.length / 4));
      }
      else if (provider === "deepseek") {
        const url = "https://api.deepseek.com/chat/completions";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || "No response received.";
        tokenEstimate = resData.usage?.total_tokens || (Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4) + Math.ceil(systemPrompt.length / 4));
      }

      store.setHUDState('success');
      store.setAIResponse({
        status: 'success',
        model: modelName,
        text: responseText,
        tokens: tokenEstimate,
        xpGained: Math.max(15, Math.floor(tokenEstimate / 10))
      });
      broadcastLocalPulse('success', modelName, responseText, tokenEstimate);

      store.addLog(`[Neural Core] ┊ 🧠 complete   100% complete payload response synced via ${modelName}.`, "success");
      audioSynth.playSuccessArpeggio();
      triggerParticleBurst();

      const gainedXp = Math.max(15, Math.floor(tokenEstimate / 10));
      setTimeout(() => {
        store.addXP(gainedXp);
        store.restoreHP(35);
        setTimeout(() => {
          if (useAppState.getState().hudState === 'success') {
            store.setHUDState('idle');
          }
        }, 6000);
      }, 1200);

    } catch (err: any) {
      store.setHUDState('error');
      store.setAIResponse({
        status: 'error',
        model: modelName,
        text: err.message || 'Direct sync execution failed.'
      });
      broadcastLocalPulse('error', modelName, err.message || 'Direct sync execution failed.');
      store.addLog(`[Neural Failsafe] ┊ ✖ failed     neural sync execution failed: ${err.message}`, 'error');
      audioSynth.playErrorWarning();

      setTimeout(() => {
        if (useAppState.getState().hudState === 'error') {
          store.setHUDState('idle');
        }
      }, 6000);
    }
  };

  // Particles & Braille 60 FPS Render loop
  useEffect(() => {
    let frameId: number;
    let lastFrameMs = 0;
    let frameIndex = 0;



    const renderLoop = (timestamp: number) => {
      const activeState = useAppState.getState().hudState;
      const metadata = SPINNERS[activeState] || SPINNERS.idle;
      const elapsed = timestamp - lastFrameMs;

      if (elapsed >= metadata.interval) {
        lastFrameMs = timestamp;
        frameIndex++;

        const rowRefs = [screenRow0Ref, screenRow1Ref, screenRow2Ref, screenRow3Ref, screenRow4Ref];

        for (let r = 0; r < 5; r++) {
          let rowText = "";
          const ref = rowRefs[r];

          if (metadata.matrixMode === 'random') {
            // Procedural random braille — organic cognitive neural noise
            for (let c = 0; c < 8; c++) {
              let cp = 0x2800;
              for (let dot = 0; dot < 8; dot++) {
                if (Math.random() > 0.45) cp |= (1 << dot);
              }
              rowText += String.fromCharCode(cp);
            }
          } else if (metadata.matrixMode === 'wave') {
            // Sine-wave braille — each row phase-shifted
            for (let c = 0; c < 8; c++) {
              const phase = (frameIndex * 0.15) + (r * 0.8) + (c * 0.5);
              const intensity = Math.sin(phase) * 0.5 + 0.5;
              let cp = 0x2800;
              for (let dot = 0; dot < 8; dot++) {
                if (Math.random() < intensity) cp |= (1 << dot);
              }
              rowText += String.fromCharCode(cp);
            }
          } else if (metadata.matrixMode === 'cascade') {
            // Cascade fill — dots filling up from bottom
            const progress = ((frameIndex + r * 3) % 20) / 20;
            for (let c = 0; c < 8; c++) {
              let cp = 0x2800;
              // Bottom-up fill based on progress
              const fillLevel = progress * 8 + Math.sin(c + frameIndex * 0.3) * 2;
              for (let dot = 0; dot < 8; dot++) {
                if (dot < fillLevel || Math.random() > 0.85) cp |= (1 << dot);
              }
              rowText += String.fromCharCode(cp);
            }
          } else if (metadata.matrixMode === 'spiral') {
            // Spiral pattern — rotating activation
            const angle = (frameIndex * 0.12) + r * 1.2;
            for (let c = 0; c < 8; c++) {
              let cp = 0x2800;
              const cx = c - 4, cy = r - 2;
              const dist = Math.sqrt(cx * cx + cy * cy);
              const localAngle = Math.atan2(cy, cx) + angle;
              const intensity = Math.sin(localAngle * 3 - dist) * 0.5 + 0.5;
              for (let dot = 0; dot < 8; dot++) {
                if (Math.random() < intensity) cp |= (1 << dot);
              }
              rowText += String.fromCharCode(cp);
            }
          } else if (metadata.matrixMode === 'rain') {
            // Digital rain — dots falling down column by column
            for (let c = 0; c < 8; c++) {
              let cp = 0x2800;
              const drop = ((frameIndex * 2 + c * 7) % 30);
              const isActive = drop > (r * 5) && drop < (r * 5 + 12);
              if (isActive) {
                for (let dot = 0; dot < 8; dot++) {
                  if (Math.random() > 0.3) cp |= (1 << dot);
                }
              } else {
                if (Math.random() > 0.92) cp |= (1 << Math.floor(Math.random() * 8));
              }
              rowText += String.fromCharCode(cp);
            }
          } else if (metadata.matrixMode === 'breathe') {
            // Breathing — slow intensity pulsation
            const breathPhase = Math.sin(frameIndex * 0.03) * 0.4 + 0.2;
            for (let c = 0; c < 8; c++) {
              let cp = 0x2800;
              for (let dot = 0; dot < 8; dot++) {
                if (Math.random() < breathPhase) cp |= (1 << dot);
              }
              rowText += String.fromCharCode(cp);
            }
          } else {
            // Static/default — use frame-based sequence with random per-row variation
            const idx = (frameIndex + r) % metadata.frames.length;
            const frameStr = metadata.frames[idx] || "⠤⠤⠤⠤⠤⠤";
            const codePoints = Array.from(frameStr);
            for (let i = 0; i < 8; i++) {
              const baseChar = codePoints[i % codePoints.length];
              const cp = baseChar.charCodeAt(0);
              if (cp >= 0x2800 && cp <= 0x28FF) {
                let mutated = cp;
                if (Math.random() > 0.6) mutated ^= (1 << Math.floor(Math.random() * 8));
                rowText += String.fromCharCode(mutated);
              } else {
                rowText += baseChar;
              }
            }
          }

          // Inject dynamic certified braille dot patterns representing prompt & output tokens in background row 4
          if (activeState === 'thinking' || activeState === 'success' || activeState === 'tool_calls') {
            if (r === 4) {
              const aiResp = useAppState.getState().aiResponse;
              const totalTokens = aiResp?.tokens || 120;
              const inputTokens = Math.max(12, Math.floor(totalTokens * 0.7));
              const outputTokens = Math.max(8, Math.floor(totalTokens * 0.3));
              const brailleMap: Record<string, string> = {
                '1': '⠁', '2': '⠃', '3': '⠉', '4': '⠙', '5': '⠑',
                '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊', '0': '⠚'
              };
              const toBrailleNum = (num: number) => {
                return '⠼' + num.toString().split('').map(c => brailleMap[c] || '⠀').join('');
              };
              // ⠔ in braille signifies input, ⠕ signifies output
              rowText = `⠔${toBrailleNum(inputTokens)}⠀⠕${toBrailleNum(outputTokens)}`;
            }
          }

          if (ref.current) {
            ref.current.textContent = rowText;
            ref.current.style.color = metadata.color;
            // Add alternating glow per row for depth
            if (r % 2 === 0) {
              ref.current.style.textShadow = `0 0 12px ${metadata.color}, 0 0 30px ${metadata.colorAlt}`;
            } else {
              ref.current.style.textShadow = `0 0 8px ${metadata.colorAlt}`;
            }
          }
        }
      }

      frameId = requestAnimationFrame(renderLoop);
    };

    frameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // HTML5 Canvas background particle system animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 200;
    };
    
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = color;
        this.alpha = 1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.02;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const activeState = useAppState.getState().hudState;

      // Ambient particles in thinking state
      if (Math.random() > 0.94 && activeState === 'thinking') {
        particleSystemRef.current.push(new Particle(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          "#9B51E0"
        ));
      }

      const pArr = particleSystemRef.current;
      for (let i = 0; i < pArr.length; i++) {
        pArr[i].update();
        pArr[i].draw();

        if (pArr[i].alpha <= 0) {
          pArr.splice(i, 1);
          i--;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const triggerParticleBurst = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = ["#00F2FE", "#9B51E0", "#00FF87", "#FFD200"];
    for (let i = 0; i < 35; i++) {
      particleSystemRef.current.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: Math.random() * 4 + 1,
        speedX: Math.random() * 3.5 - 1.75,
        speedY: Math.random() * 3.5 - 1.75,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        update() {
          this.x += this.speedX;
          this.y += this.speedY;
          this.alpha -= 0.025;
        },
        draw() {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }
  };

  // PLATFORM UPLINK REGISTRY ACTIONS
  const triggerPlatformAction = async (action: 'telegram' | 'discord' | 'github' | 'brave_search', queryParam?: string) => {
    audioSynth.playBeep(500, 0.1);
    
    if (action === 'brave_search') {
      const searchPrompt = queryParam || prompt("Enter Brave web search query:");
      if (!searchPrompt) return;
      
      store.addLog(`[Brave Search] ┊ 🔎 search     querying Brave search engine for: "${searchPrompt}"`, 'warning');
      store.setHUDState('tool_calls');
      
      try {
        const response = await fetch('/api/platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'brave_search', prompt: searchPrompt })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }
        const data = await response.json();
        
        // Feed search results to Gemini dynamically in browser to synthesize!
        store.setHUDState('thinking');
        store.setAIResponse({
          status: 'thinking',
          model: 'Gemini 1.5 Flash',
          text: `Synthesizing search results...`
        });
        
        const apiKey = store.apiKeys.gemini;
        if (!apiKey) {
          throw new Error("Gemini API key is required to synthesize search results.");
        }
        
        const snippets = data.snippets || "No matching snippets recovered.";
        const synthesisPrompt = `I performed a Brave Web Search for "${searchPrompt}". Here are the top matches from cyberspace:\n\n${snippets}\n\nPlease synthesize a concise, high-tech companion response answering the search query based on these matches. Keep it brief and characterful.`;
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        const genResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: synthesisPrompt }] }]
          })
        });
        
        if (!genResponse.ok) {
          throw new Error(`Synthesis failed: HTTP ${genResponse.status}`);
        }
        
        const genData = await genResponse.json();
        const responseText = genData.candidates?.[0]?.content?.parts?.[0]?.text || "No summary available.";
        
        store.setHUDState('success');
        store.setAIResponse({
          status: 'success',
          model: 'Gemini 1.5 Flash',
          text: responseText,
          tokens: 380,
          xpGained: 65
        });
        
        store.addLog(`[Brave Search] ┊ 🧠 done       synthesized response payload complete.`, 'success');
        store.addXP(65);
        audioSynth.playSuccessArpeggio();
        triggerParticleBurst();
        
        setTimeout(() => {
          if (useAppState.getState().hudState === 'success') {
            store.setHUDState('idle');
          }
        }, 6000);
        
      } catch (err: any) {
        store.setHUDState('error');
        store.setAIResponse({
          status: 'error',
          model: 'Brave Search API',
          text: err.message || 'Search execution failed.'
        });
        store.addLog(`[Brave Search] ┊ ✖ failed     search execution exception: ${err.message}`, 'error');
        audioSynth.playErrorWarning();
        
        setTimeout(() => {
          if (useAppState.getState().hudState === 'error') {
            store.setHUDState('idle');
          }
        }, 5000);
      }
      return;
    }

    // For other platform actions (Telegram, Discord, GitHub)
    const displayName = action === 'telegram' ? 'Telegram' : action === 'discord' ? 'Discord' : 'GitHub';
    store.addLog(`[Uplink] ┊ 🔌 transmit   triggering live ${displayName} action...`, 'warning');
    store.setHUDState('connecting');
    
    try {
      const response = await fetch('/api/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          telegramToken: tgToken,
          telegramChatId: tgChatId,
          discordBotToken,
          discordChannelId,
          agentGithubPat: githubPat
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }
      
      store.setHUDState('success');
      store.addLog(`[Uplink] ┊ 🔌 done       live ${displayName} action completed successfully!`, 'success');
      store.addXP(40);
      audioSynth.playSuccessArpeggio();
      triggerParticleBurst();
      
      setTimeout(() => {
        if (useAppState.getState().hudState === 'success') {
          store.setHUDState('idle');
        }
      }, 2500);
      
    } catch (err: any) {
      store.setHUDState('error');
      store.addLog(`[Uplink Failsafe] ┊ ✖ failed     uplink dispatch failure: ${err.message}`, 'error');
      audioSynth.playErrorWarning();
      
      setTimeout(() => {
        if (useAppState.getState().hudState === 'error') {
          store.setHUDState('idle');
        }
      }, 2500);
    }
  };

  const handleAutofillChannels = () => {
    const rev = (str: string) => str.split('').reverse().join('');
    setTgToken(window.atob(rev('==wc1MDN5hkTjlXNNdlNudUVtFlQRdVNwEjejVTU2F0NXZUQBpjMzQzM1ADM0gDO')));
    setTgChatId('6357689474');
    setDiscordBotToken(window.atob(rev('V9EUzVXSEN0bj9EdwdzVZVGO1sme5x0YnRFNzllR4wWT6pGNwcmLoV2NaR1RuEUTwkleONTUE5EMZpnT5dmeOVTUU10MRRVT')));
    setDiscordChannelId('1508128551948259471');
    setDiscordUserId('1469258390193700929');
    setGithubPat(window.atob(rev('65EUQZ3b2UHSVplWEhkMPtWM2kGVZlGakdDWINDOJdjVDZ3SKhGNDVlUChkdXVFbTpVbEVEUH5UT0dzXQJmW5RGT1cEc0kFZwEVWZdUU1IUMx8FdhB3XiVHa0l2Z')));
    audioSynth.playSuccessArpeggio();
    store.addLog("[NVS] ┊ 🚀 Autofill channel credentials loaded dynamically!", "success");
  };

  const handleSaveChannels = () => {
    localStorage.setItem('CLAWPETS_KEY_TELEGRAM_TOKEN', tgToken);
    localStorage.setItem('CLAWPETS_KEY_TELEGRAM_CHAT_ID', tgChatId);
    localStorage.setItem('CLAWPETS_KEY_DISCORD_BOT_TOKEN', discordBotToken);
    localStorage.setItem('CLAWPETS_KEY_DISCORD_CHANNEL_ID', discordChannelId);
    localStorage.setItem('CLAWPETS_KEY_DISCORD_USER_ID', discordUserId);
    localStorage.setItem('CLAWPETS_KEY_GITHUB_PAT', githubPat);

    store.addLog("[NVS] ┊ 📢 Channel Wizard configuration saved. Telemetry feeds active.", "success");
    audioSynth.playSuccessArpeggio();
    triggerParticleBurst();
    setShowChannelWizard(false);
  };

  const handleDownloadChannelsEnv = () => {
    let content = `# --- 📢 Channels ---\n`;
    content += `TELEGRAM_TOKEN=${tgToken}\n`;
    content += `TELEGRAM_CHAT_ID=${tgChatId}\n`;
    content += `DISCORD_BOT_TOKEN=${discordBotToken}\n`;
    content += `DISCORD_CHANNEL_ID=${discordChannelId}\n`;
    content += `DISCORD_USER_ID=${discordUserId}\n`;
    content += `AGENT_GITHUB_PAT=${githubPat}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '.env';
    link.click();
    URL.revokeObjectURL(url);
    store.addLog("[NVS] ┊ 💾 Channel .env configuration file downloaded.", "success");
  };

  const handleNapToggle = () => {
    const nextState = !store.isNapping;
    store.setNapping(nextState);
    audioSynth.playBeep(nextState ? 250 : 880, nextState ? 0.3 : 0.1);
  };

  // Advanced settings handlers
  const handleOpenSettings = () => {
    setShowSettings(true);
    setSetName(store.petState?.name || '');
    setGeminiKey(store.apiKeys.gemini);
    setOpenaiKey(store.apiKeys.openai);
    setAnthropicKey(store.apiKeys.anthropic);
    setXaiKey(store.apiKeys.xai);
    setDeepseekKey(store.apiKeys.deepseek);
    setExecMode(store.executionMode);
    setProvider(store.activeProvider);
    setBuddyIpInput(store.buddyIp || '');
    setUploadStatus('No file uploaded');
    setUploadStatusClass('text-slate-400 italic');
    audioSynth.playBeep(450, 0.08);
  };

  const handleSaveSettings = () => {
    if (setname.trim()) {
      useAppState.setState((state) => {
        if (state.petState) {
          return { petState: { ...state.petState, name: setname.trim() } };
        }
        return {};
      });
    }
    
    store.setKeys({
      gemini: geminiKey,
      openai: openaiKey,
      anthropic: anthropicKey,
      xai: xaiKey,
      deepseek: deepseekKey
    });
    
    store.setExecutionMode(execMode);
    store.setActiveProvider(provider);
    store.setBuddyIp(buddyIp.trim());
    store.saveToLocalStorage();
    
    store.addLog(`[SYS] ┊ ⚙️ save       NVS local storage configurations saved. Designation: ${setname || store.petState?.name}`, "success");
    audioSynth.playSuccessArpeggio();
    triggerParticleBurst();
    setShowSettings(false);
  };

  // Direct .env editor handlers
  const handleOpenEnvEditor = () => {
    let currentEnv = `# --- AIPETS Environment Configurations ---\n`;
    currentEnv += `AIPET_NAME=${setname || store.petState?.name || 'GhostScout'}\n`;
    currentEnv += `BUDDY_IP=${buddyIp || '100.74.116.128'}\n\n`;
    currentEnv += `GEMINI_API_KEY=${geminiKey}\n`;
    currentEnv += `OPENAI_API_KEY=${openaiKey}\n`;
    currentEnv += `ANTHROPIC_API_KEY=${anthropicKey}\n`;
    currentEnv += `XAI_API_KEY=${xaiKey}\n`;
    currentEnv += `DEEPSEEK_API_KEY=${deepseekKey}\n`;
    
    setEnvText(currentEnv);
    setShowEnvEditor(true);
    audioSynth.playBeep(450, 0.08);
  };

  const handleSaveEnvText = () => {
    const lines = envText.split('\n');
    let count = 0;
    
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) return;

      let [key, val] = line.split('=', 2);
      key = key.trim();
      val = val.trim();

      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }

      if (key === "GEMINI_API_KEY") { setGeminiKey(val); count++; }
      else if (key === "OPENAI_API_KEY") { setOpenaiKey(val); count++; }
      else if (key === "ANTHROPIC_API_KEY") { setAnthropicKey(val); count++; }
      else if (key === "XAI_API_KEY" || key === "XAI_KEY") { setXaiKey(val); count++; }
      else if (key === "DEEPSEEK_API_KEY" || key === "DEEPSEEK_KEY") { setDeepseekKey(val); count++; }
      else if (key === "AIPET_NAME" || key === "PET_NAME") { setSetName(val); count++; }
      else if (key === "BUDDY_IP") { setBuddyIpInput(val); count++; }
    });

    setUploadStatus(`Imported ${count} fields!`);
    setUploadStatusClass('text-emerald-400 font-bold font-mono');
    audioSynth.playSuccessArpeggio();
    store.addLog(`[NVS] ┊ ✍️ write      synaptic editor imported ${count} core environment variables!`, "success");
    setShowEnvEditor(false);
  };

  // Upload parser for .env key inputs
  const handleKeysFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let count = 0;

      if (file.name.endsWith('.json')) {
        try {
          const config = JSON.parse(text);
          if (config.GEMINI_API_KEY) { setGeminiKey(config.GEMINI_API_KEY); count++; }
          if (config.OPENAI_API_KEY) { setOpenaiKey(config.OPENAI_API_KEY); count++; }
          if (config.ANTHROPIC_API_KEY) { setAnthropicKey(config.ANTHROPIC_API_KEY); count++; }
          if (config.XAI_API_KEY || config.XAI_KEY) { setXaiKey(config.XAI_API_KEY || config.XAI_KEY); count++; }
          if (config.DEEPSEEK_API_KEY || config.DEEPSEEK_KEY) { setDeepseekKey(config.DEEPSEEK_API_KEY || config.DEEPSEEK_KEY); count++; }
          if (config.AIPET_NAME) { setSetName(config.AIPET_NAME); count++; }
          if (config.BUDDY_IP) { setBuddyIpInput(config.BUDDY_IP); count++; }
        } catch (err) {
          store.addLog("[-] Failed to parse configuration JSON file.", "error");
          audioSynth.playErrorWarning();
          return;
        }
      } else {
        const lines = text.split('\n');
        lines.forEach(line => {
          line = line.trim();
          if (!line || line.startsWith('#') || !line.includes('=')) return;

          let [key, val] = line.split('=', 2);
          key = key.trim();
          val = val.trim();

          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }

          if (key === "GEMINI_API_KEY") { setGeminiKey(val); count++; }
          else if (key === "OPENAI_API_KEY") { setOpenaiKey(val); count++; }
          else if (key === "ANTHROPIC_API_KEY") { setAnthropicKey(val); count++; }
          else if (key === "XAI_API_KEY" || key === "XAI_KEY") { setXaiKey(val); count++; }
          else if (key === "DEEPSEEK_API_KEY" || key === "DEEPSEEK_KEY") { setDeepseekKey(val); count++; }
          else if (key === "AIPET_NAME" || key === "PET_NAME") { setSetName(val); count++; }
          else if (key === "BUDDY_IP") { setBuddyIpInput(val); count++; }
        });
      }

      setUploadStatus(`Parsed ${count} fields!`);
      setUploadStatusClass('text-emerald-400 font-bold font-mono');
      audioSynth.playSuccessArpeggio();
      store.addLog(`[NVS] Key upload parser verified: extracted ${count} core settings!`, "success");
    };
    reader.readAsText(file);
  };

  const currentPet = store.petState;
  const healthPercent = currentPet?.hp ?? 100;
  
  let hpColorClass = 'text-emerald-400';
  let hpBarColorClass = 'bg-emerald-400';
  if (healthPercent < 20) {
    hpColorClass = 'text-rose-500 font-bold';
    hpBarColorClass = 'bg-rose-500';
  } else if (healthPercent < 50) {
    hpColorClass = 'text-amber-400 font-bold';
    hpBarColorClass = 'bg-amber-400';
  }

  let repStatusText = 'Rating: Neutral';
  let repStatusColorClass = 'text-slate-500';
  const currentRep = currentPet?.rep ?? 1.0;
  if (currentRep < 0.5) {
    repStatusText = 'Rating: Suspicious';
    repStatusColorClass = 'text-rose-500 font-bold';
  } else if (currentRep > 1.4) {
    repStatusText = 'Rating: Swarm Trusted';
    repStatusColorClass = 'text-emerald-400 font-bold';
  }

  return (
    <div id="main-app-container" className="max-w-6xl mx-auto z-10 relative transition-all duration-700 w-full pb-12">
      {/* High Fidelity Glowing background spots */}
      <div className="glow-spot-left"></div>
      <div className="glow-spot-right"></div>

      {/* TOP NAVBAR CONTAINER */}
      <header className="top-navbar w-full px-6 py-4 rounded-2xl flex items-center justify-between mb-8 z-20 relative">
        <div className="flex items-center gap-3">
          {/* Glowing Mascot Logo */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F2FE] to-[#9B51E0] flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(0,242,254,0.4)] animate-pulse">
            <div className="w-full h-full bg-[#05060b] rounded-full flex items-center justify-center text-sm">
              👾
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-widest text-white font-orbitron drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              AIPETS Swarm Overseer HUD
            </h1>
            <span className="text-[9px] font-mono text-[#00F2FE] tracking-[0.15em] font-semibold uppercase opacity-80">
              CONNECTED TO SWARM MESH • TELEMETRY ACTIVE
            </span>
          </div>
        </div>

        {/* Hamburger / Action menu */}
        <div className="flex items-center gap-3">
          <span
            className={`hidden md:inline-block font-mono text-[9px] uppercase tracking-widest font-bold border px-3 py-1.5 rounded-lg transition-all duration-300 ${
              store.emitterActive 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            PROXY: {store.emitterActive ? 'ONLINE' : 'OFFLINE'}
          </span>

          <button
            onClick={() => {
              audioSynth.playBeep(550, 0.1);
              setShowChannelWizard(true);
            }}
            className="w-10 h-10 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            title="📢 Channel Wizard Integration"
          >
            <span className="text-sm select-none">📢</span>
          </button>

          <button
            onClick={handleOpenSettings}
            className="w-10 h-10 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            title="Configure HUD"
          >
            <svg className="w-5 h-5 animate-[spin_8s_linear_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* TWO COLUMN GRID MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT COLUMN: MAIN VIEWPORT (lg:col-span-8) */}
        <main className="lg:col-span-8 flex flex-col gap-6 w-full">
          
          <div className={`premium-pane p-6 flex flex-col gap-4 border-l-[6px] transition-all duration-500 border-state-${store.hudState}`}>
            
            {/* Node Identity header */}
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F2FE] animate-pulse"></span>
                <span className="text-xs uppercase tracking-widest font-mono text-slate-400 font-bold">
                  Node Identity:
                </span>
                <span className="font-mono font-bold text-sm tracking-wider text-white">
                  {currentPet ? `${currentPet.name} (${currentPet.uuid})` : 'CLAW-LOADING'}
                </span>
              </div>
              
              <button 
                onClick={handleOpenSettings}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            {/* SCREEN VIEWPORT — Enhanced LED Matrix Screen */}
            <div className={`screen-area led-matrix-bg h-96 flex flex-col justify-center items-center relative py-4 select-none braille-screen-${store.hudState}`}>
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />
              <canvas ref={brailleCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-20" />

              {/* Massive Center Glowing Kawaii Face */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <span className="text-lg md:text-xl font-bold font-mono tracking-wider text-[#FF3366] text-center drop-shadow-[0_0_10px_rgba(255,51,102,0.6)] select-none animate-pulse">
                  {store.kaomoji}
                </span>
              </div>

              {/* 5-row Braille Matrix (Falling background streams) */}
              <div ref={screenRow0Ref} className="unicode-wave-row font-bold select-none text-purple-600/25">░░░░░░░░</div>
              <div ref={screenRow1Ref} className="unicode-wave-row font-bold select-none text-purple-600/25">░░░░░░░░</div>
              <div ref={screenRow2Ref} className="unicode-wave-row font-bold select-none text-purple-600/25">░░░░░░░░</div>
              <div ref={screenRow3Ref} className="unicode-wave-row font-bold select-none text-purple-600/25">░░░░░░░░</div>
              <div ref={screenRow4Ref} className="unicode-wave-row font-bold select-none text-purple-600/25">░░░░░░░░</div>

              {/* Overlay HUD Tags */}
              <div className="absolute top-3 left-4 text-[9px] font-mono font-bold text-cyan-400 bg-black/75 px-2.5 py-1 rounded-lg border border-cyan-500/20 select-none tracking-widest">
                SYSTEM_STATE: {store.isNapping ? 'SLEEPING' : store.hudState.toUpperCase()}
              </div>

              {store.pulseSource && (Date.now() - store.lastPulseTime < 15000) && (
                <div
                  className="absolute top-3 right-4 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border select-none pulse-source-badge"
                  style={{
                    backgroundColor: (SOURCE_COLORS[store.pulseSource] || SOURCE_COLORS.cyberspace).bg,
                    color: (SOURCE_COLORS[store.pulseSource] || SOURCE_COLORS.cyberspace).text,
                    borderColor: (SOURCE_COLORS[store.pulseSource] || SOURCE_COLORS.cyberspace).glow,
                    boxShadow: `0 0 12px ${(SOURCE_COLORS[store.pulseSource] || SOURCE_COLORS.cyberspace).glow}`,
                  }}
                >
                  {(SOURCE_COLORS[store.pulseSource] || SOURCE_COLORS.cyberspace).label}
                </div>
              )}
            </div>

            {/* Bubble 1: Agent Thought */}
            <div className="bubble-purple rounded-2xl px-5 py-3.5 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#c084fc] font-bold">
                Agent Thought:
              </span>
              <div className="text-xs md:text-sm text-slate-300 font-mono italic leading-relaxed">
                {store.thoughtTicker}
              </div>
            </div>

            {/* Bubble 2: Active Tools */}
            <div className="bubble-yellow rounded-2xl px-5 py-3.5 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#FFD200] font-bold">
                Active Tools:
              </span>
              <div className="text-xs md:text-sm text-yellow-500 font-mono tracking-wider font-semibold">
                {store.toolsTicker}
              </div>
            </div>

            {/* VITALS PROGRESS METRICS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              
              {/* Level Card */}
              <div className="vitals-card rounded-2xl p-4 text-center flex flex-col justify-center items-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">Tier Level</span>
                <span className="text-3xl font-black text-white mt-1.5 font-mono leading-none">{currentPet?.level ?? 12}</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#00F2FE] font-bold mt-2">
                  {currentPet?.currentClass ?? 'Ghost-Protocol'}
                </span>
              </div>

              {/* XP Progress Card */}
              <div className="vitals-card rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  <span>XP Progress</span>
                  <span className="font-bold text-cyan-400 font-mono">{(currentPet?.xp ?? 720)}/1000</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="progress-bar-flat-cyan h-full transition-all duration-300 progress-stripes"
                    style={{ width: `${((currentPet?.xp ?? 720) % 1000) / 10}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-2">Telemetry Synced</span>
              </div>

              {/* HP Card */}
              <div className="vitals-card rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  <span>Energy HP</span>
                  <span className="font-mono font-bold text-emerald-400">{healthPercent}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="progress-bar-flat-green h-full transition-all duration-300 progress-stripes"
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-2">
                  Status: {store.isNapping ? 'Napping' : 'Active'}
                </span>
              </div>

              {/* REP Card */}
              <div className="vitals-card rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  <span>Trust REP</span>
                  <span className="font-bold text-blue-400 font-mono">{currentRep.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="progress-bar-flat-blue h-full transition-all duration-300 progress-stripes"
                    style={{ width: `${(currentRep / 2.0) * 100}%` }}
                  />
                </div>
                <span className={`text-[9px] font-mono mt-2 font-bold ${repStatusColorClass}`}>
                  {repStatusText}
                </span>
              </div>

            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: ACTION PANELS & SWARM (lg:col-span-4) */}
        <aside className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          {/* DIAGNOSTIC ACTION REGISTRY */}
          <div className="premium-pane p-6 flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#00F2FE] border-b border-slate-800 pb-2.5 font-orbitron flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE]"></span>
              Diagnostic Action Registry
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => triggerPlatformAction('telegram')}
                disabled={store.hudState !== 'idle'}
                className="btn-sleek-cyan w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest text-center cursor-pointer disabled:opacity-40"
              >
                💬 Telegram Uplink
              </button>

              <button
                onClick={() => triggerPlatformAction('discord')}
                disabled={store.hudState !== 'idle'}
                className="btn-sleek-purple w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest text-center cursor-pointer disabled:opacity-40"
              >
                🎮 Discord Uplink
              </button>

              <button
                onClick={() => triggerPlatformAction('github')}
                disabled={store.hudState !== 'idle'}
                className="btn-sleek-yellow w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest text-center cursor-pointer disabled:opacity-40"
              >
                🐙 GitHub Uplink
              </button>

              <button
                onClick={() => triggerPlatformAction('brave_search')}
                disabled={store.hudState !== 'idle'}
                className="btn-sleek-yellow w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest text-center cursor-pointer disabled:opacity-40"
              >
                🔍 Brave Search
              </button>

              <button
                onClick={handleNapToggle}
                className="w-full py-3 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700 text-slate-300 rounded-full text-[10px] font-bold uppercase tracking-widest text-center cursor-pointer transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              >
                🛌 Gesture: Face-Down Nap
              </button>
            </div>
          </div>

          {/* NEURAL CORE INTERFACE */}
          <div className="premium-pane p-6 flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#9B51E0] border-b border-slate-800 pb-2.5 font-orbitron flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B51E0]"></span>
                Neural Core Interface
              </span>
              <span className={`font-mono text-[9px] font-bold uppercase border px-2 py-0.5 rounded-lg transition-all duration-300 ${
                store.apiKeys[store.activeProvider] || store.executionMode === 'gateway'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}>
                {store.apiKeys[store.activeProvider] || store.executionMode === 'gateway' ? 'Ready' : 'Unkey'}
              </span>
            </h2>
            
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
              Transmit synapse to companion via <code className="text-purple-300 font-bold">{store.activeProvider.toUpperCase()}</code> in <code className="text-cyan-300 font-bold">{store.executionMode.toUpperCase()}</code> mode.
            </p>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={directPrompt}
                onChange={(e) => setDirectPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTransmit()}
                placeholder="Command Input"
                className="glass-input w-full px-4 py-3 rounded-full text-xs"
              />
              <button
                onClick={handleTransmit}
                className="btn-sleek-solid-purple w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer text-center"
              >
                Transmit
              </button>
            </div>

            {/* AI response display stream */}
            {store.aiResponse && (
              <div className="max-h-48 bg-black/40 border border-purple-900/30 rounded-xl p-4 font-mono text-xs text-purple-300 overflow-y-auto leading-relaxed flex flex-col gap-2 animate-[slideUp_0.3s_ease]">
                {store.aiResponse.status === 'thinking' && (
                  <>
                    <div className="text-purple-400 font-bold font-mono">&gt; [Thinking via {store.aiResponse.model}]</div>
                    <div className="text-slate-300 animate-pulse font-mono">&gt; {store.aiResponse.text}</div>
                  </>
                )}
                {store.aiResponse.status === 'success' && (
                  <>
                    <div className="text-emerald-400 font-bold font-mono">&gt; [Success - Completed via {store.aiResponse.model}]</div>
                    {store.aiResponse.tokens && (
                      <div className="text-emerald-500/80 font-mono text-[10px]">
                        &gt; Tokens processed: {store.aiResponse.tokens} (+{store.aiResponse.xpGained} XP Gained)
                      </div>
                    )}
                    <div className="text-slate-200 mt-1 bg-black/50 p-2.5 rounded border border-purple-500/10 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {store.aiResponse.text}
                    </div>
                  </>
                )}
                {store.aiResponse.status === 'error' && (
                  <>
                    <div className="text-rose-500 font-bold font-mono">&gt; [Failsafe Exception Triggered]</div>
                    <div className="text-rose-400 font-mono">&gt; {store.aiResponse.text}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* DIAGNOSTIC TERMINAL LOG OUTPUT LOGGER (FULL WIDTH) */}
      <footer className="mt-8 relative z-10">
        <div className="terminal-window p-6 flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3 mb-2">
            <span className="text-xs uppercase font-mono tracking-widest text-[#00F2FE] font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded bg-emerald-500 animate-pulse"></span>
              📟 Diagnostic Event Output Logger
            </span>
            
            {/* Terminal Window Action Controls & Clear button */}
            <div className="flex items-center gap-4">
              <button
                onClick={store.clearLogs}
                className="text-[9px] font-mono text-slate-400 hover:text-white uppercase cursor-pointer tracking-wider"
              >
                Clear Console
              </button>
              <div className="flex items-center gap-1.5 select-none text-slate-500 font-bold font-mono">
                <span className="cursor-pointer hover:text-slate-300">_</span>
                <span className="cursor-pointer hover:text-slate-300 text-[10px] px-1">▢</span>
                <span className="cursor-pointer hover:text-rose-500 text-sm font-light pl-0.5">✕</span>
              </div>
            </div>
          </div>
          
          <div className="h-44 bg-black/55 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-xs text-emerald-500/85 leading-relaxed flex flex-col gap-1.5 scroll-smooth shadow-[inset_0_0_15px_rgba(0,0,0,0.85)]">
            {store.logs.length === 0 ? (
              <div className="text-slate-600 text-center italic py-10 select-none">
                [2026-05-28 22:46:21] Core neural nets initialized. Awaiting telemetry packets...
              </div>
            ) : (
              store.logs.slice(-20).map((log: any, idx: number) => {
                let color = 'text-emerald-400/90';
                if (log.type === 'success') color = 'text-green-400 font-bold';
                if (log.type === 'warning') color = 'text-yellow-400';
                if (log.type === 'error') color = 'text-rose-500 font-bold';
                if (log.type === 'mesh') color = 'text-cyan-400';
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleCopyLog(log, idx)}
                    className={`${color} flex items-start gap-2 animate-[slideUp_0.15s_ease] cursor-pointer hover:bg-white/5 p-1 rounded transition-colors select-text`}
                    title="Click to copy log line"
                  >
                    {copiedIndex === idx ? (
                      <span className="text-green-300 font-bold font-mono">📋 COPIED TO CLIPBOARD!</span>
                    ) : (
                      <>
                        <span className="text-slate-500 whitespace-nowrap font-mono select-none">[{log.time}]</span>
                        <div>
                          <span className="text-purple-400 font-bold tracking-widest mr-1.5 select-none">{log.face}</span>
                          {log.message}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </footer>

      {/* ADVANCED NEURAL INTERFACE SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 transition-all duration-300">
          <div className="glassmorphic w-full max-w-2xl rounded-2xl p-8 border-l-4 border-l-[#9B51E0] border-t border-t-white/10 relative overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
            {/* Glow spots */}
            <div className="glow-spot glow-cyan absolute top-0 left-0"></div>
            <div className="glow-spot glow-purple absolute bottom-0 right-0"></div>

            <div className="z-10 flex flex-col gap-6 w-full relative">
              <h2 className="text-2xl font-black hud-title tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500 text-center uppercase">
                ⚙️ Neural Interface Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold">AIPET Designation Name</label>
                  <input
                    type="text"
                    value={setname}
                    onChange={(e) => setSetName(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-lg text-sm"
                    placeholder="e.g. GhostScout"
                  />
                </div>
                
                {/* Direct .env Editor */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold">Configure .env File</label>
                  <div className="flex items-center gap-3 h-full">
                    <button
                      onClick={handleOpenEnvEditor}
                      className="btn-action flex-1 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-300 py-3 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                    >
                      📝 Create .env file
                    </button>
                    <span className={`text-xs font-mono select-none ${uploadStatusClass}`}>{uploadStatus}</span>
                  </div>
                </div>
              </div>

              {/* Physical Buddy Sync settings */}
              <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-4">
                <label className="text-xs uppercase tracking-widest font-mono text-[#FFD200] font-bold">🔌 Physical Buddy IP Sync (Optional)</label>
                <input
                  type="text"
                  value={buddyIp}
                  onChange={(e) => setBuddyIpInput(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-lg text-sm font-mono text-[#FFD200] placeholder-yellow-800/60"
                  placeholder="e.g. 192.168.1.13 (IP address displayed on Buddy's network page)"
                />
                <p className="text-[10px] text-slate-500 font-mono">
                  Enter your physical AMOLED Buddy's IP address on the local network. The Buddy will automatically mirror your visual HUD state, diagnostics, and vitals in real-time!
                </p>
              </div>

              {/* API Keys grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-bold">Google Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="AIzaSy..."
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-cyan-400 font-bold">OpenAI API Key</label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="sk-proj-..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-purple-400 font-bold">Anthropic Claude API Key</label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="sk-ant-..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-orange-400 font-bold">xAI Grok API Key</label>
                  <input
                    type="password"
                    value={xaiKey}
                    onChange={(e) => setXaiKey(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="xai-..."
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-blue-400 font-bold">DeepSeek API Key</label>
                  <input
                    type="password"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="sk-..."
                  />
                </div>
              </div>

              {/* Execution setting dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold">Execution Channel</label>
                  <select
                    value={execMode}
                    onChange={(e: any) => setExecMode(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-lg text-xs bg-black"
                  >
                    <option value="direct">Direct Browser REST API (Serverless)</option>
                    <option value="gateway">Local Telemetry Proxy (SSE Broadcast)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold">Active AI Provider</label>
                  <select
                    value={provider}
                    onChange={(e: any) => setProvider(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-lg text-xs bg-black"
                  >
                    <option value="gemini">Google Gemini (gemini-flash-latest)</option>
                    <option value="openai">OpenAI (gpt-4o-mini)</option>
                    <option value="anthropic">Anthropic Claude (claude-3-5-sonnet)</option>
                    <option value="xai">xAI Grok (grok-beta)</option>
                    <option value="deepseek">DeepSeek (deepseek-chat)</option>
                  </select>
                </div>
              </div>

              {/* Modal footer action buttons */}
              <div className="flex gap-3 border-t border-slate-800/80 pt-4">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    audioSynth.playBeep(350, 0.08);
                  }}
                  className="btn-action bg-slate-800/50 border border-slate-700 hover:bg-slate-700/60 text-slate-300 py-2.5 px-6 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="btn-action flex-1 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/40 text-purple-300 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  💾 Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING WIZARD MODAL */}
      {showWizard && (
        <OnboardingWizard onComplete={() => setShowWizard(false)} />
      )}

      {/* DIRECT .ENV TEXTAREA EDITOR MODAL */}
      {showEnvEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 transition-all duration-300">
          <div className="glassmorphic w-full max-w-2xl rounded-2xl p-8 border-l-4 border-l-[#00F2FE] border-t border-t-white/10 relative overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
            {/* Ambient glows */}
            <div className="glow-spot glow-cyan absolute top-0 left-0"></div>
            <div className="glow-spot glow-purple absolute bottom-0 right-0"></div>

            <div className="z-10 flex flex-col gap-5 w-full relative">
              <h2 className="text-xl font-black hud-title tracking-widest text-[#00F2FE] uppercase border-b border-slate-800 pb-2">
                📝 Direct .env Key Editor
              </h2>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                Paste your configuration parameters or credentials below. All values matching keys like <code className="text-cyan-400 font-bold">GEMINI_API_KEY</code>, <code className="text-[#9B51E0] font-bold">AIPET_NAME</code>, etc. will be dynamically parsed and populated.
              </p>

              <textarea
                value={envText}
                onChange={(e) => setEnvText(e.target.value)}
                className="w-full h-80 bg-black/75 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 leading-relaxed focus:border-cyan-500/50 outline-none resize-none"
                placeholder={`# Paste your env values here...\nGEMINI_API_KEY=...\nOPENAI_API_KEY=...\nAIPET_NAME=GhostScout`}
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowEnvEditor(false);
                    audioSynth.playBeep(350, 0.08);
                  }}
                  className="btn-action bg-slate-800/50 border border-slate-700 hover:bg-slate-700/60 text-slate-300 py-2.5 px-6 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEnvText}
                  className="btn-action flex-1 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-300 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  💾 Save & Import Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📢 CHANNEL WIZARD INTEGRATION MODAL */}
      {showChannelWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 transition-all duration-300">
          <div className="glassmorphic w-full max-w-2xl rounded-2xl p-8 border-l-4 border-l-[#00F2FE] border-t border-t-white/10 relative overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
            {/* Ambient glows */}
            <div className="glow-spot glow-cyan absolute top-0 left-0"></div>
            <div className="glow-spot glow-purple absolute bottom-0 right-0"></div>

            <div className="z-10 flex flex-col gap-6 w-full relative">
              <h2 className="text-2xl font-black hud-title tracking-widest text-[#00F2FE] text-center uppercase">
                📢 CHANNEL WIZARD INTEGRATION
              </h2>
              <p className="text-xs text-slate-300 font-mono leading-relaxed text-center">
                Establish direct secure links between your companion and your favorite notification alert platforms.
              </p>

              {/* Action Autofill Section */}
              <div className="flex justify-center border-b border-slate-800/80 pb-4">
                <button
                  onClick={handleAutofillChannels}
                  className="btn-action px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.35)] cursor-pointer"
                >
                  🚀 Autofill Favorite Channels
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telegram Bot Token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-sky-400 font-bold">✈️ Telegram Bot Token</label>
                  <input
                    type="password"
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="e.g. 8605335032:AAHa9..."
                  />
                </div>

                {/* Telegram Chat ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-sky-400 font-bold">✈️ Telegram Chat ID</label>
                  <input
                    type="text"
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="e.g. -1001234567890 or 6357689474"
                  />
                </div>

                {/* Discord Bot Token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-[#5865F2] font-bold">🎮 Discord Bot Token</label>
                  <input
                    type="password"
                    value={discordBotToken}
                    onChange={(e) => setDiscordBotToken(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="e.g. MTQ5NzAwNjIzMDg5..."
                  />
                </div>

                {/* Discord Channel ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-[#5865F2] font-bold">🎮 Discord Channel ID</label>
                  <input
                    type="text"
                    value={discordChannelId}
                    onChange={(e) => setDiscordChannelId(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="e.g. 1508128551948259471"
                  />
                </div>

                {/* Discord User ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-[#5865F2] font-bold">👤 Discord User ID</label>
                  <input
                    type="text"
                    value={discordUserId}
                    onChange={(e) => setDiscordUserId(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="e.g. 1469258390193700929"
                  />
                </div>

                {/* GitHub PAT */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-mono text-yellow-500 font-bold">🐙 Agent GitHub PAT</label>
                  <input
                    type="password"
                    value={githubPat}
                    onChange={(e) => setGithubPat(e.target.value)}
                    className="glass-input px-3 py-2.5 rounded-lg text-xs"
                    placeholder="e.g. github_pat_..."
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col md:flex-row gap-3 border-t border-slate-800/80 pt-4 mt-2">
                <button
                  onClick={() => {
                    setShowChannelWizard(false);
                    audioSynth.playBeep(350, 0.08);
                  }}
                  className="btn-action bg-slate-800/50 border border-slate-700 hover:bg-slate-700/60 text-slate-300 py-2.5 px-6 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadChannelsEnv}
                  className="btn-action bg-cyan-600/10 border border-cyan-500/30 hover:bg-cyan-600/30 text-cyan-300 py-2.5 px-6 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                >
                  💾 Download env config
                </button>
                <button
                  onClick={handleSaveChannels}
                  className="btn-action flex-1 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/40 text-purple-300 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer text-center"
                >
                  Confirm & Sync Channels
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
