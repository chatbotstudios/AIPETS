'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HUDState, LogEntry, SwarmPeer, useAppState } from '@/lib/store';
import { audioSynth } from '@/lib/audio-synth';

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
    color: "#00F2FE",
    colorAlt: "#0891B2",
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
    color: "#9B51E0",
    colorAlt: "#C084FC",
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
    color: "#FFD200",
    colorAlt: "#F59E0B",
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

  // Load local state and keys
  useEffect(() => {
    store.loadFromLocalStorage();
    // Start background EventSource SSE listening for LiteLLM telemetry pulses
    initSSEListener();
  }, []);

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

  // EventSource SSE Listener for Telemetry Proxy
  const initSSEListener = () => {
    if (typeof window === 'undefined') return;
    
    console.log("[Telemetry Mesh] Initializing EventSource SSE receiver...");
    store.addLog("[Telemetry Mesh] Listening for cyberspace LLM proxy events via /api/sse", "mesh");
    
    let eventSource = new EventSource('/api/sse');

    eventSource.onopen = () => {
      store.setEmitterActive(true);
      store.addLog("[Telemetry Mesh] SSE telemetry downlink channel established.", "mesh");
    };

    eventSource.onerror = (err) => {
      console.warn("[Telemetry Mesh] EventSource disconnected. Retrying...");
      store.setEmitterActive(false);
      eventSource.close();
      
      // Auto reconnect after 4 seconds
      setTimeout(initSSEListener, 4000);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleTelemetryPulse(data);
      } catch (e) {
        console.error("[Telemetry Mesh] Error parsing SSE payload:", e);
      }
    };
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
      store.addLog(`[Cyberspace Link] Pulse received from ${model}: "${text}"`, "mesh");
      triggerParticleBurst();
    }
    else if (status === "success") {
      store.setAIResponse({
        status: 'success',
        model,
        text,
        tokens: data.tokens || 120,
        xpGained: Math.max(15, Math.floor((data.tokens || 120) / 10))
      });
      
      store.addLog(`[Cyberspace Success] Query completed via ${model}. Telemetry logged.`, "success");
      audioSynth.playSuccessArpeggio();
      triggerParticleBurst();
      
      const xp = Math.max(15, Math.floor((data.tokens || 120) / 10));
      store.addXP(xp);

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
      store.addLog(`[-] Cyberspace Exception: ${text}`, "error");
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

    if (store.executionMode === 'gateway') {
      // Simulate/trigger Local Gateway proxy behavior
      store.setHUDState('thinking');
      store.setAIResponse({
        status: 'thinking',
        model: 'Local Telemetry Proxy',
        text: `Transmitting pulse request to gateway stream...`
      });
      
      store.addLog(`[Neural Sync] Transmitted command to proxy: "${prompt}"`, 'mesh');
      
      // Post to proxy API
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: store.activeProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
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
        store.addLog(`[-] Gateway dispatch failure: ${err.message}`, 'error');
        audioSynth.playErrorWarning();
      }
      return;
    }

    // Direct Browser REST API Mode
    const provider = store.activeProvider;
    let apiKey = store.apiKeys[provider];
    let modelName = "";

    if (provider === "gemini") modelName = "gemini-1.5-flash";
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

    store.addLog(`[Neural Sync] Streaming request to direct ${modelName}...`, 'mesh');

    try {
      let responseText = "";
      let tokenEstimate = 0;

      if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
        tokenEstimate = Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4);
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
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || "No response received.";
        tokenEstimate = resData.usage?.total_tokens || (Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4));
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
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || "No response received.";
        tokenEstimate = resData.usage?.total_tokens || (Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4));
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
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || "No response received.";
        tokenEstimate = resData.usage?.total_tokens || (Math.ceil(prompt.length / 4) + Math.ceil(responseText.length / 4));
      }

      store.setHUDState('success');
      store.setAIResponse({
        status: 'success',
        model: modelName,
        text: responseText,
        tokens: tokenEstimate,
        xpGained: Math.max(15, Math.floor(tokenEstimate / 10))
      });

      store.addLog(`[Neural Core] Success! Got 100% complete response payload from ${modelName}.`, "success");
      audioSynth.playSuccessArpeggio();
      triggerParticleBurst();

      const gainedXp = Math.max(15, Math.floor(tokenEstimate / 10));
      setTimeout(() => {
        store.addXP(gainedXp);
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
      store.addLog(`[-] Neural Failsafe Triggered: ${err.message}`, 'error');
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

  // DIAGNOSTIC REGISTRY ACTIONS
  const triggerPassiveScan = () => {
    audioSynth.playBeep(600, 0.08);
    store.addLog("Initiating background spectrum scan on 2.4GHz...", 'warning');
    store.setHUDState('connecting');

    setTimeout(() => {
      const ssids = ["HomeNet-5G", "XfinityWifi", "NetGear_Secure", "CoffeeShop_Free", "CLAW-HIVE-01"];
      const foundCount = 1 + Math.floor(Math.random() * 4);

      store.addLog(`Passive Scan Complete. Analyzed ${foundCount} ambient beacon sources:`, 'success');
      for (let i = 0; i < foundCount; i++) {
        const dbm = -30 - Math.floor(Math.random() * 60);
        const ssid = ssids[i % ssids.length];
        store.addLog(`   |-- SSID: ${ssid} | RSSI: ${dbm} dBm`, 'info');
      }

      store.addXP(45 + foundCount * 15);
      audioSynth.playSuccessArpeggio();
      triggerParticleBurst();
      store.setHUDState('success');
      
      setTimeout(() => {
        if (useAppState.getState().hudState === 'success') {
          store.setHUDState('idle');
        }
      }, 2500);
    }, 3000);
  };

  const triggerIntelCapture = () => {
    audioSynth.playBeep(450, 0.1);
    store.addLog("Processing accumulated telemetry indices...", 'warning');
    store.setHUDState('thinking');

    setTimeout(() => {
      store.addLog("Aggregating signal records into SQLite partition...", 'info');
      store.addLog("Writing current PET_STATE.json parameters into local NVS Preferences...", 'info');

      store.addXP(30);
      audioSynth.playBeep(880, 0.15);
      triggerParticleBurst();
      store.setHUDState('success');

      setTimeout(() => {
        if (useAppState.getState().hudState === 'success') {
          store.setHUDState('idle');
        }
      }, 2000);
    }, 2500);
  };

  const triggerCooperativeSync = () => {
    audioSynth.playBeep(800, 0.08);
    store.addLog("Scanning mesh interface for active sibling nodes...", 'warning');
    store.setHUDState('tool_calls');

    setTimeout(() => {
      const peers = store.swarmPeers;
      if (peers.length === 0) {
        store.addLog("[-] Zero sibling nodes detected in range. Broadcast vibe-key timed out.", 'warning');
        store.setHUDState('error');
        audioSynth.playErrorWarning();
        
        setTimeout(() => {
          if (useAppState.getState().hudState === 'error') {
            store.setHUDState('idle');
          }
        }, 2000);
      } else {
        const peer = peers[Math.floor(Math.random() * peers.length)];
        store.addLog(`[Mesh Sync] Est. Connection with peer [${peer.name}]!`, 'mesh');
        store.addLog(`[Neural Sync] Synchronizing emotional index & BSSID indices...`, 'mesh');

        store.addXP(150);
        store.restoreHP(20);
        
        audioSynth.playSuccessArpeggio();
        triggerParticleBurst();
        store.setHUDState('success');

        setTimeout(() => {
          if (useAppState.getState().hudState === 'success') {
            store.setHUDState('idle');
          }
        }, 2500);
      }
    }, 2000);
  };

  const triggerDreamLoop = () => {
    audioSynth.playBeep(350, 0.25);
    store.addLog("Entering Boredom Dream Loop reflection phase...", 'warning');
    store.setHUDState('thinking');
    audioSynth.playSpaceyChime();

    setTimeout(() => {
      store.addLog("Processed synthetic attack simulation models during sleep state.", 'info');
      store.addXP(80);
      store.setHUDState('success');
      
      setTimeout(() => {
        if (useAppState.getState().hudState === 'success') {
          store.setHUDState('idle');
        }
      }, 2000);
    }, 3500);
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
    
    store.addLog(`[SYS] Configuration saved. Name: ${setname || store.petState?.name} | Channel: ${execMode.toUpperCase()} | Provider: ${provider.toUpperCase()}`, "success");
    audioSynth.playSuccessArpeggio();
    triggerParticleBurst();
    setShowSettings(false);
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
    <div id="main-app-container" className="max-w-6xl mx-auto z-10 relative transition-all duration-700 w-full">
      <header className="text-center mb-8 relative flex flex-col items-center">
        <div className="flex items-center gap-1.5 justify-center">
          <h1 className="text-5xl font-black hud-title tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#9B51E0] to-[#FF3366] inline-block drop-shadow-[0_0_15px_rgba(0,242,254,0.5)]">
            AIPETS
          </h1>
          <span className="text-slate-500 font-mono text-xs tracking-[0.2em] font-semibold mt-4 ml-1">SWARM_OVERSEER_V2.0</span>
        </div>
        <p className="text-cyan-400 font-mono mt-2 text-xs uppercase tracking-widest opacity-80 animate-pulse">
          Connected to Swarm Mesh &gt; Telemetry Active
        </p>

        {/* Header Action Badges */}
        <div className="md:absolute md:top-0 md:right-0 flex flex-wrap items-center gap-2 mt-4 md:mt-0 justify-center">
          <button
            onClick={handleOpenSettings}
            className="text-[10px] text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 px-3 py-1.5 rounded uppercase tracking-widest font-mono transition-all cursor-pointer"
          >
            ⚙️ Settings
          </button>
          
          <span
            className={`font-mono text-[9px] uppercase tracking-widest font-bold border px-3 py-1.5 rounded transition-all duration-300 ${
              store.emitterActive 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            Proxy Downlink: {store.emitterActive ? 'Online' : 'Offline'}
          </span>
          
          <button
            onClick={() => {
              if(confirm("Confirm hard wipe of companion NVS state?")) {
                store.nukeState();
                audioSynth.playErrorWarning();
              }
            }}
            className="text-[10px] text-rose-500/70 hover:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 px-3 py-1.5 rounded uppercase tracking-widest font-mono transition-all cursor-pointer"
          >
            Reset State
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: MAIN GLASSMORPHIC HUD (7 Cols) */}
        <main className="lg:col-span-7 flex flex-col gap-6 w-full">
          
          {/* HUD VIEWPORT PANEL */}
          <div className={`glassmorphic glassmorphic-hud p-6 flex flex-col gap-4 border-state-${store.hudState}`}>
            
            {/* ROW 1: Identity */}
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
              <span className="text-xs uppercase tracking-widest font-mono text-[#00F2FE] font-bold">Node Identity</span>
              <span className="font-mono font-bold text-sm tracking-wider text-slate-300">
                {currentPet ? `${currentPet.name} (${currentPet.uuid})` : 'CLAW-LOADING'}
              </span>
            </div>

            {/* SCREEN AREA VIEWPORT — Expanded Braille Matrix */}
            <div className={`screen-area h-96 flex flex-col justify-center items-center relative py-4 select-none braille-screen-${store.hudState}`}>
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />
              <canvas ref={brailleCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-20" />

              {/* 5-row Braille Matrix */}
              <div ref={screenRow0Ref} className="unicode-wave-row font-bold select-none">░░░░░░░░</div>
              <div ref={screenRow1Ref} className="unicode-wave-row font-bold select-none">░░░░░░░░</div>
              <div ref={screenRow2Ref} className="unicode-wave-row font-bold select-none">░░░░░░░░</div>
              <div ref={screenRow3Ref} className="unicode-wave-row font-bold select-none">░░░░░░░░</div>
              <div ref={screenRow4Ref} className="unicode-wave-row font-bold select-none">░░░░░░░░</div>

              {/* Status overlays */}
              <div className="absolute top-3 left-4 text-xs font-mono text-cyan-400 bg-black/60 px-2.5 py-0.5 rounded border border-cyan-500/20 select-none">
                STATE: {store.isNapping ? 'SLEEPING' : store.hudState.toUpperCase()}
              </div>

              {/* Pulse Source Badge */}
              {store.pulseSource && (Date.now() - store.lastPulseTime < 15000) && (
                <div
                  className="absolute top-3 right-4 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded border select-none pulse-source-badge"
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

              <div className="absolute bottom-3 right-4 text-sm font-mono text-slate-400 bg-black/60 px-2.5 py-0.5 rounded select-none">
                {store.kaomoji}
              </div>
            </div>

            {/* ROW 2: Agent Thought Ticker */}
            <div className="ticker-container px-4 py-2 border border-slate-800/50 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#9B51E0] font-bold">Agent Thought</span>
              <div className="text-xs md:text-sm text-slate-300 font-mono italic whitespace-nowrap overflow-hidden text-ellipsis">
                {store.thoughtTicker}
              </div>
            </div>

            {/* ROW 3: Active Tools Ticker */}
            <div className="ticker-container px-4 py-2 border border-slate-800/50 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#FFD200] font-bold">Active Tools</span>
              <div className="text-xs md:text-sm text-yellow-500 font-mono tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                {store.toolsTicker}
              </div>
            </div>

            {/* VITALS METRICS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              
              {/* LEVEL/CLASS */}
              <div className="bg-black/40 border border-slate-800/60 rounded-xl p-3.5 text-center flex flex-col justify-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Tier Level</span>
                <span className="text-2xl font-black text-slate-200 mt-1 font-mono">{currentPet?.level ?? 1}</span>
                <span className="text-[9px] font-mono uppercase tracking-wide text-[#00F2FE] font-bold mt-1">
                  {currentPet?.currentClass ?? 'Cyber-Egg'}
                </span>
              </div>

              {/* XP progress bar */}
              <div className="bg-black/40 border border-slate-800/60 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  <span>XP Progress</span>
                  <span className="font-bold text-slate-300 font-mono">{(currentPet?.xp ?? 0) % 1000}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.8)]">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-300 progress-stripes shadow-[0_0_10px_var(--cyan-neon)]"
                    style={{ width: `${((currentPet?.xp ?? 0) % 1000) / 10}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1">Next: 1,000 XP</span>
              </div>

              {/* HP metabolic energy */}
              <div className="bg-black/40 border border-slate-800/60 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  <span>Energy HP</span>
                  <span className={`font-mono font-bold ${hpColorClass}`}>{healthPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.8)]">
                  <div
                    className={`h-full transition-all duration-300 progress-stripes shadow-[0_0_10px_currentColor] ${hpBarColorClass}`}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1">
                  Status: {store.isNapping ? 'Napping' : 'Active'}
                </span>
              </div>

              {/* REP trust rating */}
              <div className="bg-black/40 border border-slate-800/60 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  <span>Trust REP</span>
                  <span className="font-bold text-indigo-400 font-mono">{currentRep.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.8)]">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300 progress-stripes shadow-[0_0_10px_var(--purple-neon)]"
                    style={{ width: `${(currentRep / 2.0) * 100}%` }}
                  />
                </div>
                <span className={`text-[9px] font-mono mt-1 ${repStatusColorClass}`}>
                  {repStatusText}
                </span>
              </div>

            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: ACTION PANELS & SWARM (5 Cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-6 w-full">
          
          {/* DIAGNOSTIC ACTION REGISTRY */}
          <div className="glassmorphic rounded-2xl p-6 flex flex-col gap-4 border-t border-t-white/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#00F2FE] border-b border-slate-800 pb-2 font-orbitron">
              🧬 Diagnostic Action Registry
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={triggerPassiveScan}
                disabled={store.hudState !== 'idle'}
                className="btn-action bg-cyan-600/10 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-center cursor-pointer disabled:opacity-40"
              >
                📡 Passive Scan
              </button>

              <button
                onClick={triggerIntelCapture}
                disabled={store.hudState !== 'idle'}
                className="btn-action bg-purple-600/10 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-center cursor-pointer disabled:opacity-40"
              >
                ⚙️ Process Intel
              </button>

              <button
                onClick={triggerCooperativeSync}
                disabled={store.hudState !== 'idle'}
                className="btn-action bg-emerald-600/10 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-center cursor-pointer disabled:opacity-40"
              >
                🤝 Neural Sync
              </button>

              <button
                onClick={triggerDreamLoop}
                disabled={store.hudState !== 'idle'}
                className="btn-action bg-yellow-600/10 hover:bg-yellow-600/30 border border-yellow-500/40 text-yellow-300 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-center cursor-pointer disabled:opacity-40"
              >
                💤 Dream Loop
              </button>

              <button
                onClick={handleNapToggle}
                className="btn-action bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700 text-slate-300 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-center col-span-2 cursor-pointer"
              >
                🛌 Toggle Gesture: Face-Down Nap
              </button>
            </div>

            {/* Simulated Parameter Sliders */}
            <div className="border-t border-slate-800/80 pt-3 mt-1 flex flex-col gap-3">
              <div>
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
                  <span>Simulate Hardware Battery</span>
                  <span className="font-bold text-slate-200">{store.batteryPercent}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={store.batteryPercent}
                  onChange={(e) => store.setBatteryPercent(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
                  <span>Swarm Multiplier Peer Count</span>
                  <span className="font-bold text-slate-200">
                    {store.swarmPeers.length + 1} ({store.swarmPeers.length} Peers + Self)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={store.swarmPeers.length + 1}
                  onChange={(e) => store.setSwarmCount(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#9B51E0]"
                />
              </div>
            </div>
          </div>

          {/* NEURAL CORE INTERFACE */}
          <div className="glassmorphic rounded-2xl p-6 flex flex-col gap-4 border-t border-t-white/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#9B51E0] border-b border-slate-800 pb-2 flex justify-between items-center font-orbitron">
              <span>🧠 Neural Core Interface</span>
              <span className={`font-mono text-[9px] font-bold uppercase border px-2 py-0.5 rounded transition-all duration-300 ${
                store.apiKeys[store.activeProvider] || store.executionMode === 'gateway'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}>
                {store.apiKeys[store.activeProvider] || store.executionMode === 'gateway' ? 'Ready' : 'Unkey'}
              </span>
            </h2>
            
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Direct telemetry prompt trigger. Executing via <code className="text-purple-300 font-bold">{store.activeProvider.toUpperCase()}</code> in <code className="text-cyan-300 font-bold">{store.executionMode.toUpperCase()}</code> mode.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={directPrompt}
                onChange={(e) => setDirectPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTransmit()}
                placeholder="Transmit prompt stream to companion..."
                className="glass-input flex-1 px-3 py-2.5 rounded-lg text-xs"
              />
              <button
                onClick={handleTransmit}
                className="btn-action bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-300 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
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

          {/* DIAGNOSTIC EVENT OUTPUT LOGGER */}
          <div className="glassmorphic rounded-2xl p-6 flex flex-col gap-3 border-t border-t-white/5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#00F2FE] font-orbitron">
                📟 Diagnostic Event Logger
              </h2>
              <button
                onClick={store.clearLogs}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase cursor-pointer"
              >
                Clear Terminal
              </button>
            </div>
            
            <div className="h-64 bg-black/60 border border-slate-900/60 rounded-xl p-4 overflow-y-auto font-mono text-xs text-emerald-500/85 leading-relaxed flex flex-col gap-1.5 scroll-smooth pr-1">
              {store.logs.length === 0 ? (
                <div className="text-slate-600 text-center italic py-16 select-none">
                  Awaiting telemetry packets...
                </div>
              ) : (
                store.logs.map((log: LogEntry, idx: number) => {
                  let color = 'text-emerald-400/90';
                  if (log.type === 'success') color = 'text-green-400 font-bold';
                  if (log.type === 'warning') color = 'text-yellow-400';
                  if (log.type === 'error') color = 'text-rose-500 font-bold';
                  if (log.type === 'mesh') color = 'text-cyan-400';
                  
                  return (
                    <div key={idx} className={`${color} flex items-start gap-2 animate-[slideUp_0.15s_ease]`}>
                      <span className="text-slate-500 whitespace-nowrap font-mono select-none">[{log.time}]</span>
                      <div className="break-words">
                        <span className="text-purple-400 font-bold tracking-widest mr-1.5 select-none">{log.face}</span>
                        {log.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </aside>
      </div>

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
                
                {/* File Upload Parser */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold">Upload Key Config (.env)</label>
                  <div className="flex items-center gap-3 h-full">
                    <input
                      type="file"
                      id="modal-file-upload"
                      accept=".env,application/json"
                      className="hidden"
                      onChange={handleKeysFileUpload}
                    />
                    <button
                      onClick={() => document.getElementById('modal-file-upload')?.click()}
                      className="btn-action flex-1 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-300 py-3 rounded-lg font-bold uppercase tracking-wider text-xs cursor-pointer"
                    >
                      📂 Select .env File
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
                    <option value="gemini">Google Gemini (gemini-1.5-flash)</option>
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
    </div>
  );
}
