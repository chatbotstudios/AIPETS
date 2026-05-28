import { create } from 'zustand';
import { GameEngine, PetState } from './game-engine';

export interface SwarmPeer {
  name: string;
  mac: string;
  lvl: number;
  hp: number;
}

export interface LogEntry {
  time: string;
  face: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'mesh';
}

export type HUDState = 'idle' | 'connecting' | 'thinking' | 'tool_calls' | 'success' | 'error' | 'sleeping';

export interface APIKeys {
  gemini: string;
  openai: string;
  anthropic: string;
  xai: string;
  deepseek: string;
}

export interface AppState {
  // Onboarding & Pet Vitals
  isOnboarded: boolean;
  petState: PetState | null;
  swarmPeers: SwarmPeer[];
  batteryPercent: number;
  
  // HUD UI State
  hudState: HUDState;
  thoughtTicker: string;
  toolsTicker: string;
  kaomoji: string;
  isNapping: boolean;

  // Diagnostics & Logs
  logs: LogEntry[];
  
  // Execution & AI settings
  apiKeys: APIKeys;
  executionMode: 'direct' | 'gateway';
  activeProvider: 'gemini' | 'openai' | 'anthropic' | 'xai' | 'deepseek';
  emitterActive: boolean;
  buddyIp: string;
  pulseSource: string;
  lastPulseTime: number;

  // AI Response box state
  aiResponse: {
    status: 'idle' | 'thinking' | 'success' | 'error';
    model: string;
    text: string;
    tokens?: number;
    xpGained?: number;
  } | null;

  // Action methods
  initializePet: (name: string, startingClass: string) => void;
  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
  nukeState: () => void;
  addXP: (amount: number) => void;
  decayHP: (amount: number) => void;
  restoreHP: (amount: number) => void;
  modifyREP: (delta: number) => void;
  setBatteryPercent: (pct: number) => void;
  setHUDState: (state: HUDState) => void;
  setTickers: (thought: string, tools: string) => void;
  setNapping: (napping: boolean) => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
  clearLogs: () => void;
  setKeys: (keys: Partial<APIKeys>) => void;
  setExecutionMode: (mode: 'direct' | 'gateway') => void;
  setActiveProvider: (provider: AppState['activeProvider']) => void;
  setEmitterActive: (active: boolean) => void;
  setBuddyIp: (ip: string) => void;
  spawnMeshPeer: () => void;
  removeMeshPeer: (idx: number) => void;
  setSwarmCount: (count: number) => void;
  setAIResponse: (resp: AppState['aiResponse']) => void;
  setPulseSource: (source: string) => void;
}

const KAOMOJIS: Record<HUDState, string> = {
  idle: "( o _ o )",
  connecting: "( •_• )>⌐■-■",
  thinking: "( ๑>ᴗ<๑ )",
  tool_calls: "( ω )( ω )",
  success: "(★ ‿ ★)",
  error: "( T_T )",
  sleeping: "(-__-)"
};

const SPINNERS_METADATA: Record<HUDState, { thought: string; tools: string }> = {
  idle: {
    thought: "System quiescent. Passively sniffing ambient beacons...",
    tools: "boot_sequence, load_nvs"
  },
  connecting: {
    thought: "Establishing C2C mesh routing channels...",
    tools: "wifi_scan, channel_hop, promiscuous_rx"
  },
  thinking: {
    thought: "Evaluating spectral anomalies & network congestion models...",
    tools: "spectral_analysis, compute_xp_gain"
  },
  tool_calls: {
    thought: "Broadcasting vibe-key sync packets over ESP-NOW...",
    tools: "espnow_broadcast, peer_vibe_key_sync"
  },
  success: {
    thought: "Neural sync verification complete. Captured unique environment profile!",
    tools: "intel_db_sync, badge_unlocked_callback"
  },
  error: {
    thought: "Failsafe triggered. Core energy state depleted!",
    tools: "battery_hibernation, low_power_sleep"
  },
  sleeping: {
    thought: "Deep sleeping... Regenerating power grid.",
    tools: "low_power_sleep, battery_hibernation"
  }
};

const LOG_FACES: Record<string, string[]> = {
  // Primary Tags
  '[Boot]': ['(⌐■_■)', '(● _ ●)', '(↺ _ ↺)', "(' - ')7"],
  '[NVS]': ['(ᵔ◡◡ᵔ)', '(⚙‿‿⚙)', '(W _ W)', '(1 0 1)'],
  '[SYS]': ['(•‿‿•)', '(-__-)', '(⚆_⚆)', '(•_•)σ', '(⬚_⬚)', '(ꗄ_◄)', '(0_1)', '(↺ _ ↺)', '(  .  )', '(⫍ _ ⫎)', '(S _ S)', '[□_□]'],
  '[PWR]': ['(⇀‿‿↼)', '([ ■ ])', '(v v v)', '(◌ ◌ ◌)', '(↯ V ↯)', '(▕ ▔ ▏)'],
  '[A2C]': ['(⍰ _ ⍰)', '(→ _ ←)', '(◬ _ ◬)', '(? _ !)', '(⇘ _ ⇘)', '(⊚ _ ⊚)', '(L _ L)', '(I _ I)', '(P _ P)', '(* _ *)'],
  '[TACT]': ['(⌖_⌖)', '(ಠ_ಠ)', '(- . -)', '(> <)', '(# # #)', '(. . >)', '(>_>)'],
  '[REACTION]': ['(⊙_◎)', '(๏ ⚆ ๏)', '(☉ ๏ ☉)', '(๏ X ๏)'],
  '[SKILL]': ['(¬‿¬)', '(| | |)', '(((.)))', '(~ _ ~)'],
  '[TOOL]': ['(Q _ Q)', '(▣ B ▣)', '(⚙ _ ⚙)', '(๏ ⍰ ๏)', '(⚙ ⚙ ⚙)', '(๏ ! ๏)', '(* ๏ *)'],
  '[CRYPT]': ['([M_M])', '(⚙_⚙)', '(▩_▩)', '(◓_◒)', '(◰_◳)', '(0_1)'],
  '[FS]': ['(◓_◒)', '(⊞ _ ⊠)'],
  '[MESH]': ['(◰_◳)', '(o ∞ o)', '(> ≈ >)', '(√ _ √)', '(((.)))', '(. : .)', '(= ≡ =)', '(? ≈ ?)', '(๏ ↔ ๏)'],
  '[HW]': ['[▣_▣]', '(% _ %)', '(♨ _ ♨)'],
  '[SENTRY]': ['(º _ º)', '([ _ ])', '([ ! ])', '(█ █ █)', '(▤ ! ▤)', '(▣ H ▣)'],
  '[RADIO]': ['(░ _ ░)', '(▒ ▒ ▒)', '(█ █ █)', '(๏ v ๏)', '(░ ๏ ░)', '(✖ ✖ ✖)'],
  '[P2P]': ["(ง'̀-'́)ง", '(> = <)', '(๏ ↔ ๏)', '(> _ <)'],
  '[XP Gain]': ['(+ + +)', '(＋ ＋ ＋)', '(★ _ ★)', '(◉ _ ◉)'],
  '[XP]': ['(+ + +)', '(＋ ＋ ＋)', '(★ _ ★)'],
  '[EVO]': ['(Δ _ Δ)', '(Δ ๏ Δ)', '(Ω _ Ω)', '(! ! !)'],
  '[ERR]': ['(▨ E ▨)', '(! ⍰ ?)', '(✖ █ ✖)', '(✖ ▅ ✖)', '(E _ E)'],
  '[Recovery]': ['(⫍ _ ⫎)', '(◡ u ◡)', '(◒ _ ◓)', '(V _ V)'],
  '[Mesh Sync]': ['(√ _ √)', '(o ∞ o)', '(๏ ↔ ๏)'],
  '[Neural Sync]': ['(> ≈ >)', '(o ∞ o)', '(๏ ↔ ๏)', '(V ๏ V)'],
  '[ESP-NOW]': ['(o ∞ o)', '(๏ ↔ ๏)', '(> = <)'],
  '[Brave Search]': ['(๏ ⍰ ๏)', '(⌖ _ ⌖)', '(Q _ Q)', '(๏ ! ๏)'],
  '[Neural Core]': ['(⍞ _ ⍞)', '(ʘ ʘ ʘ)', '(I _ I)', '(⍯ _ ⍯)'],
  '[Cyberspace]': ['(▓ _ ▓)', '(0 1 0)', '(░ ░ ░)', '(◌   ◌)'],
  '[Uplink]': ['(⇮ _ ⇮)', '((o))', '(◁ ═ ▷)'],
  '[Telemetry]': ['(◌ ◉ ◌)', '(⍞ ⍯ ⍞)', '(๏ ◌ ๏)', '(∿ ๏ ∿)'],

  // Keyword associations (if they appear in the message)
  'listening': ['((o))', '(๏ ◡ ๏)', '(- . -)'],
  'established': ['(√ ๏ √)', '(✓ ๏ ✓)', '(o ∞ o)', '(√ _ √)'],
  'wiped': ['(▄ ▄ ▄)', '(✖ █ ✖)', '(✖ ▅ ✖)'],
  'initiated': ['(` _ `)', '(⇮ _ ⇮)', '(1__0)'],
  'wiped clean': ['(▄ ▄ ▄)', '(✖ █ ✖)', '(✖ ▅ ✖)'],
  'critical': ['(! ! !)', '(↯ V ↯)', '(✖ ▅ ✖)', '(! V !)'],
  'error': ['(✖ █ ✖)', '(✖ ▅ ✖)', '(▨ E ▨)', '(! ⍰ ?)'],
  'failed': ['(✖ ▅ ✖)', '(T _ T)', '(✖ █ ✖)'],
  'success': ['(★ _ ★)', '(√ ๏ √)', '(◕ ◡ ◕)', '(^‿‿^)'],
  'complete': ['(￣▽￣)', '(√ ๏ √)', '(★ _ ★)'],
  'scanning': ['(. . >)', '(< . .)', '(⌖ _ ⌖)', '(๏ ⍰ ๏)'],
  'transmitting': ['(╾ ━ ╼)', '((o))', '(◀ ≈ ▶)'],
  'synced': ['(o ∞ o)', '(V ๏ V)', '(√ ๏ √)'],
  'restored': ['(◒ _ ◓)', '(◡ u ◡)', '(•‿‿•)'],
  'milestone': ['(✪ ๏ ✪)', '(◉ _ ◉)', '(! ! !)'],
  'level': ['(△ ▲ △)', '(Δ _ Δ)', '(Ω _ Ω)'],
  'xp': ['(+ + +)', '(＋ ＋ ＋)', '(★ _ ★)'],
  'battery': ['([ ■ ])', '(◌ ◌ ◌)', '(↯ V ↯)'],
  'sleep': ['(▕ ▔ ▏)', '(-_-)zZ', '(u ─ u)'],
  'recovery': ['(⫍ _ ⫎)', '(◡ u ◡)', '(V _ V)'],
  'search': ['(๏ ⍰ ๏)', '(⌖ _ ⌖)', '(Q _ Q)'],
  'proxy': ['(◀ ≈ ▶)', '(◁ ═ ▷)', '(⍯ _ ⍯)'],
  'gossip': ['(> ≈ >)', '(> ≈ >)', '(> = <)'],
  'deauth': ['(> <)', '(> o <)', '(✖ ▅ ✖)'],
  'handshake': ['(° v °)', '(√ _ √)', '(o ∞ o)'],
  'intel': ['(⍞ _ ⍞)', '(⍯ _ ⍯)', '(ʘ ʘ ʘ)'],
};

export const useAppState = create<AppState>((set, get) => ({
  isOnboarded: false,
  petState: null,
  swarmPeers: [],
  batteryPercent: 100,
  
  hudState: 'idle',
  thoughtTicker: "Initializing internal core networks...",
  toolsTicker: "boot_sequence, load_nvs",
  kaomoji: "( o _ o )",
  isNapping: false,
  
  logs: [],
  
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
    xai: '',
    deepseek: ''
  },
  executionMode: 'direct',
  activeProvider: 'gemini',
  emitterActive: false,
  buddyIp: '',
  pulseSource: '',
  lastPulseTime: 0,
  aiResponse: null,

  initializePet: (name: string, startingClass: string) => {
    const pet = GameEngine.createNewPet(name, startingClass);
    set({
      petState: pet,
      isOnboarded: true,
      hudState: 'idle',
      thoughtTicker: SPINNERS_METADATA.idle.thought,
      toolsTicker: SPINNERS_METADATA.idle.tools,
      kaomoji: KAOMOJIS.idle
    });
    get().addLog(`[Boot] Awakening Protocol initiated. Designation: ${name} [${startingClass}]`, 'success');
    get().addLog(`[NVS] State profile synchronized successfully. ID: ${pet.uuid}`, 'success');
    get().saveToLocalStorage();
  },

  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return;
    
    // Load pet state
    const savedPet = localStorage.getItem('CLAWPETS_STATE');
    const savedKeys = {
      gemini: localStorage.getItem('CLAWPETS_KEY_GEMINI') || '',
      openai: localStorage.getItem('CLAWPETS_KEY_OPENAI') || '',
      anthropic: localStorage.getItem('CLAWPETS_KEY_ANTHROPIC') || '',
      xai: localStorage.getItem('CLAWPETS_KEY_XAI') || '',
      deepseek: localStorage.getItem('CLAWPETS_KEY_DEEPSEEK') || ''
    };
    const mode = (localStorage.getItem('CLAWPETS_EXECUTION_MODE') || 'direct') as 'direct' | 'gateway';
    const provider = (localStorage.getItem('CLAWPETS_ACTIVE_PROVIDER') || 'gemini') as AppState['activeProvider'];
    const buddyIp = localStorage.getItem('CLAWPETS_BUDDY_IP') || '';
    
    if (savedPet) {
      try {
        const parsed = JSON.parse(savedPet);
        set({
          petState: parsed,
          isOnboarded: true,
          apiKeys: savedKeys,
          executionMode: mode,
          activeProvider: provider,
          buddyIp: buddyIp
        });
      } catch (e) {
        console.error("Failed to restore local pet state:", e);
      }
    } else {
      set({
        apiKeys: savedKeys,
        executionMode: mode,
        activeProvider: provider,
        buddyIp: buddyIp
      });
    }
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;
    const { petState, apiKeys, executionMode, activeProvider, buddyIp } = get();
    if (petState) {
      localStorage.setItem('CLAWPETS_STATE', JSON.stringify(petState));
    }
    localStorage.setItem('CLAWPETS_KEY_GEMINI', apiKeys.gemini);
    localStorage.setItem('CLAWPETS_KEY_OPENAI', apiKeys.openai);
    localStorage.setItem('CLAWPETS_KEY_ANTHROPIC', apiKeys.anthropic);
    localStorage.setItem('CLAWPETS_KEY_XAI', apiKeys.xai);
    localStorage.setItem('CLAWPETS_KEY_DEEPSEEK', apiKeys.deepseek);
    localStorage.setItem('CLAWPETS_EXECUTION_MODE', executionMode);
    localStorage.setItem('CLAWPETS_ACTIVE_PROVIDER', activeProvider);
    localStorage.setItem('CLAWPETS_BUDDY_IP', buddyIp);
  },

  nukeState: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('CLAWPETS_STATE');
    }
    set({
      isOnboarded: false,
      petState: null,
      hudState: 'idle',
      swarmPeers: [],
      isNapping: false,
      aiResponse: null
    });
    get().addLog(`[SYS] NVS storage wiped clean. Failsafe reset verified.`, 'error');
  },

  addXP: (amount: number) => {
    const { petState, swarmPeers } = get();
    if (!petState) return;

    const { state: newState, gained, evolved } = GameEngine.addXP(petState, amount, swarmPeers.length + 1);
    set({ petState: newState });
    
    get().addLog(`[XP Gain] Synchronized synaptic feedback: +${gained} XP`, 'success');
    
    if (evolved) {
      get().addLog(`🎉 Milestone Evolved! Companion tier upgraded to Level ${newState.level} [${newState.currentClass}]`, 'success');
      get().setHUDState('success');
    }
    get().saveToLocalStorage();
  },

  decayHP: (amount: number) => {
    const { petState } = get();
    if (!petState) return;
    
    const newState = GameEngine.decayHP(petState, amount);
    set({ petState: newState });
    
    if (newState.hp < 20 && get().hudState !== 'error') {
      get().setHUDState('error');
      get().addLog("Warning: Companion metabolic energy critical! Charging advised.", 'error');
    }
    get().saveToLocalStorage();
  },

  restoreHP: (amount: number) => {
    const { petState } = get();
    if (!petState) return;
    
    const newState = GameEngine.restoreHP(petState, amount);
    set({ petState: newState });
    get().saveToLocalStorage();
  },

  modifyREP: (delta: number) => {
    const { petState } = get();
    if (!petState) return;
    
    const newState = GameEngine.modifyREP(petState, delta);
    set({ petState: newState });
    get().saveToLocalStorage();
  },

  setBatteryPercent: (pct: number) => {
    set({ batteryPercent: pct });
    if (pct < 20) {
      get().addLog("Hardware Telemetry: PMU reports critical battery voltage drop.", 'warning');
    }
  },

  setHUDState: (state: HUDState) => {
    const isNapping = get().isNapping;
    // Nap state blocks all visual HUD state updates except idle (which turns to sleeping)
    const activeState = isNapping ? (state === 'idle' ? 'sleeping' : 'sleeping') : state;
    
    set({ 
      hudState: activeState as HUDState,
      kaomoji: KAOMOJIS[activeState as HUDState] || KAOMOJIS.idle,
      thoughtTicker: SPINNERS_METADATA[activeState as HUDState]?.thought || SPINNERS_METADATA.idle.thought,
      toolsTicker: SPINNERS_METADATA[activeState as HUDState]?.tools || SPINNERS_METADATA.idle.tools
    });
  },

  setTickers: (thought: string, tools: string) => {
    set({ thoughtTicker: thought, toolsTicker: tools });
  },

  setNapping: (napping: boolean) => {
    set({ isNapping: napping });
    const statusText = napping ? "Status: Napping (Sleep)" : "Status: Active";
    get().addLog(`Tactile IMU Interrupt: Device ${napping ? 'face-down. Entering Sleep' : 'awake. Active'} mode.`, 'warning');
    
    if (napping) {
      get().setHUDState('sleeping' as any);
    } else {
      get().restoreHP(35);
      get().addLog("[Recovery] Sleep cycle completed. Energy recovered: +35% HP", 'success');
      get().setHUDState('idle');
    }
  },

  addLog: (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    let face = '';
    
    for (const [tag, faces] of Object.entries(LOG_FACES)) {
      if (message.includes(tag)) {
        face = faces[Math.floor(Math.random() * faces.length)];
        break;
      }
    }

    if (!face) {
      if (type === 'warning') face = '(>_>)';
      else if (type === 'error') face = '(✖_✖)';
      else if (type === 'success') face = '(^‿‿^)';
      else face = '(•_•)';
    }

    set((state) => ({
      logs: [...state.logs, { time, face, message, type }].slice(-20) // Keep last 20 entries
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
    get().addLog("Terminal clear complete. Monitoring active spectrum...");
  },

  setKeys: (keys: Partial<APIKeys>) => {
    set((state) => ({
      apiKeys: { ...state.apiKeys, ...keys }
    }));
    get().saveToLocalStorage();
  },

  setExecutionMode: (mode: 'direct' | 'gateway') => {
    set({ executionMode: mode });
    get().saveToLocalStorage();
  },

  setActiveProvider: (provider: AppState['activeProvider']) => {
    set({ activeProvider: provider });
    get().saveToLocalStorage();
  },

  setEmitterActive: (active: boolean) => {
    set({ emitterActive: active });
  },

  setBuddyIp: (ip: string) => {
    set({ buddyIp: ip });
    get().saveToLocalStorage();
  },

  spawnMeshPeer: () => {
    const peers = get().swarmPeers;
    if (peers.length >= 5) {
      get().addLog("[-] Swarm Mesh at maximum capacity (5 peers).", 'warning');
      return;
    }
    const names = ["Spectre-02", "Phantom-04", "Ghost-09", "Nexus-11", "Claw-X"];
    const name = names[peers.length] || `Claw-${peers.length + 1}`;
    const mac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':');
    const peer: SwarmPeer = { name, mac, lvl: 1 + Math.floor(Math.random() * 5), hp: 100 };
    
    set({ swarmPeers: [...peers, peer] });
    get().addLog(`[ESP-NOW] New peer discovered: ${name} [${mac}]`, 'mesh');
  },

  removeMeshPeer: (idx: number) => {
    const peers = [...get().swarmPeers];
    const removed = peers[idx];
    if (removed) {
      peers.splice(idx, 1);
      set({ swarmPeers: peers });
      get().addLog(`[ESP-NOW] Peer disconnected: ${removed.name}`, 'warning');
    }
  },

  setSwarmCount: (count: number) => {
    const targetCount = count - 1; // peers = count - 1 (since 1 is self)
    const currentCount = get().swarmPeers.length;
    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        get().spawnMeshPeer();
      }
    } else if (targetCount < currentCount) {
      for (let i = currentCount; i > targetCount; i--) {
        get().removeMeshPeer(i - 1);
      }
    }
  },

  setAIResponse: (resp: AppState['aiResponse']) => {
    set({ aiResponse: resp });
  },

  setPulseSource: (source: string) => {
    set({ pulseSource: source, lastPulseTime: Date.now() });
  }
}));
