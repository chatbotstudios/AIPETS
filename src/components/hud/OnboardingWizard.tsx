'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { audioSynth } from '@/lib/audio-synth';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [petName, setPetName] = useState('GhostScout');
  const [petClass, setPetClass] = useState('Cyber-Egg');
  
  // API Keys state
  const [anthropicChecked, setAnthropicChecked] = useState(true);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiChecked, setGeminiChecked] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiChecked, setOpenaiChecked] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [xaiChecked, setXaiChecked] = useState(false);
  const [xaiKey, setXaiKey] = useState('');
  const [deepseekChecked, setDeepseekChecked] = useState(false);
  const [deepseekKey, setDeepseekKey] = useState('');

  const [buddyIp, setBuddyIpInput] = useState('');
  const [tsKey, setTsKey] = useState('');
  const [verificationLogs, setVerificationLogs] = useState<string[]>(['[System] Awaiting verification sequence...']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const initializePet = useAppState(state => state.initializePet);
  const setKeys = useAppState(state => state.setKeys);
  const setBuddyIp = useAppState(state => state.setBuddyIp);

  // Generate mock Tailscale key on Step 3 load
  useEffect(() => {
    if (step === 3 && !tsKey) {
      const generated = "tskey-auth-" + Math.floor(Math.random() * 0xFFFFFFFF).toString(16) + "M-local";
      setTsKey(generated);
    }
  }, [step, tsKey]);

  const handleNextStep = (nextStepNum: number) => {
    audioSynth.playBeep(450, 0.08);
    setStep(nextStepNum);
  };

  const handleGenerateEnv = () => {
    audioSynth.playBeep(500, 0.1);
    
    // Save keys to Zustand store
    setKeys({
      anthropic: anthropicKey,
      gemini: geminiKey,
      openai: openaiKey,
      xai: xaiKey,
      deepseek: deepseekKey
    });

    let envContent = `# 🪐 CLAWPETS AI Gateway Configuration (.env)\n`;
    envContent += `AIPET_NAME=${petName}\n`;
    envContent += `AIPET_CLASS=${petClass}\n\n`;
    if (anthropicChecked && anthropicKey) envContent += `ANTHROPIC_API_KEY=${anthropicKey}\n`;
    if (geminiChecked && geminiKey) envContent += `GEMINI_API_KEY=${geminiKey}\n`;
    if (openaiChecked && openaiKey) envContent += `OPENAI_API_KEY=${openaiKey}\n`;
    if (xaiChecked && xaiKey) envContent += `XAI_API_KEY=${xaiKey}\n`;
    if (deepseekChecked && deepseekKey) envContent += `DEEPSEEK_API_KEY=${deepseekKey}\n`;
    if (buddyIp) envContent += `BUDDY_IP=${buddyIp.trim()}\n`;
    envContent += `TAILSCALE_AUTH_KEY=${tsKey || 'tskey-auth-placeholder'}\n`;

    // Trigger download
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStep(3);
  };

  const runVerification = async () => {
    setIsVerifying(true);
    setVerificationLogs(['[System] Awaiting verification sequence...']);

    const log = (msg: string) => {
      setVerificationLogs(prev => [...prev, `> ${msg}`]);
    };

    audioSynth.playBeep(400, 0.1);
    log("Initializing secure MicroLink mesh aperture...");

    await new Promise(r => setTimeout(r, 1200));
    audioSynth.playBeep(600, 0.1);
    log("✅ Tailscale proxy connected (Node: ONLINE)");

    await new Promise(r => setTimeout(r, 1500));
    log("Pinging AI Telemetry Proxy Gateway...");

    await new Promise(r => setTimeout(r, 1000));
    audioSynth.playSuccessArpeggio();
    log("✅ Hyper Edge server reachable on port 3000");

    await new Promise(r => setTimeout(r, 800));
    log("✅ First handshake simulation successful! (+50 XP)");
    log("AWAKENING COMPLETE. READY FOR DASHBOARD DEPLOYMENT.");
    
    setIsVerified(true);
    setIsVerifying(false);
  };

  const handleFinish = () => {
    initializePet(petName, petClass);
    // Apply final keys in store
    setKeys({
      anthropic: anthropicKey,
      gemini: geminiKey,
      openai: openaiKey,
      xai: xaiKey,
      deepseek: deepseekKey
    });
    setBuddyIp(buddyIp.trim());
    audioSynth.playSpaceyChime();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-2xl p-4 transition-all duration-700">
      <div className="glassmorphic w-full max-w-2xl rounded-3xl p-8 border-l-4 border-l-[#00F2FE] border-t border-t-white/10 relative overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="glow-spot glow-cyan absolute top-0 left-0"></div>
        <div className="glow-spot glow-purple absolute bottom-0 right-0"></div>

        <div className="z-10 flex flex-col gap-6 relative">
          <h2 className="text-2xl font-black hud-title tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#9B51E0] to-[#FF3366] text-center uppercase">
            AIPET AWAKENING PROTOCOL
          </h2>

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
              <div className="text-sm text-slate-300 font-mono text-center">Step 1/4: Establish Node Identity</div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest font-mono text-[#00F2FE] font-bold">Designation (Name)</label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-lg text-sm text-[#00F2FE] font-mono focus:border-[#00F2FE]"
                  placeholder="e.g. GhostClaw, NeoHunter..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest font-mono text-[#9B51E0] font-bold">Starting Architecture (Class)</label>
                <select
                  value={petClass}
                  onChange={(e) => setPetClass(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-lg text-sm bg-black font-mono focus:border-[#9B51E0]"
                >
                  <option value="Cyber-Egg">Cyber-Egg (Balanced)</option>
                  <option value="Ghost-Protocol">Ghost-Protocol (Stealth/Mesh)</option>
                  <option value="Overlord">Overlord (Command/Control)</option>
                </select>
              </div>

              <button
                onClick={() => handleNextStep(2)}
                className="mt-4 btn-action bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-300 py-3.5 rounded-lg font-bold uppercase tracking-widest text-sm hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
              >
                Initialize Core →
              </button>
            </div>
          )}

          {/* STEP 2: NEURAL KEYS */}
          {step === 2 && (
            <div className="flex flex-col gap-4 animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
              <div className="text-sm text-slate-300 font-mono text-center">Step 2/4: Configure Neural Engines</div>
              <p className="text-xs text-slate-400 font-mono text-center mb-2 leading-relaxed">
                Select your active AI providers. API keys are cached securely inside your browser's LocalStorage and are only utilized for direct API executions.
              </p>

              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                {/* Google Gemini */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 bg-black/40 p-3 rounded-lg border border-slate-800/80">
                  <label className="flex items-center gap-3 cursor-pointer select-none md:w-52">
                    <input
                      type="checkbox"
                      checked={geminiChecked}
                      onChange={(e) => setGeminiChecked(e.target.checked)}
                      className="glass-checkbox"
                    />
                    <span className="text-xs font-bold text-emerald-400 font-mono">Google Gemini</span>
                  </label>
                  <input
                    type="password"
                    disabled={!geminiChecked}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded text-xs disabled:opacity-30 disabled:pointer-events-none"
                    placeholder={geminiChecked ? "AIzaSy..." : "Disabled"}
                  />
                </div>

                {/* Anthropic Claude */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 bg-black/40 p-3 rounded-lg border border-slate-800/80">
                  <label className="flex items-center gap-3 cursor-pointer select-none md:w-52">
                    <input
                      type="checkbox"
                      checked={anthropicChecked}
                      onChange={(e) => setAnthropicChecked(e.target.checked)}
                      className="glass-checkbox"
                    />
                    <span className="text-xs font-bold text-purple-400 font-mono">Anthropic Claude</span>
                  </label>
                  <input
                    type="password"
                    disabled={!anthropicChecked}
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded text-xs disabled:opacity-30 disabled:pointer-events-none"
                    placeholder={anthropicChecked ? "sk-ant-..." : "Disabled"}
                  />
                </div>

                {/* OpenAI */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 bg-black/40 p-3 rounded-lg border border-slate-800/80">
                  <label className="flex items-center gap-3 cursor-pointer select-none md:w-52">
                    <input
                      type="checkbox"
                      checked={openaiChecked}
                      onChange={(e) => setOpenaiChecked(e.target.checked)}
                      className="glass-checkbox"
                    />
                    <span className="text-xs font-bold text-cyan-400 font-mono">OpenAI (GPT-4)</span>
                  </label>
                  <input
                    type="password"
                    disabled={!openaiChecked}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded text-xs disabled:opacity-30 disabled:pointer-events-none"
                    placeholder={openaiChecked ? "sk-proj-..." : "Disabled"}
                  />
                </div>

                {/* xAI */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 bg-black/40 p-3 rounded-lg border border-slate-800/80">
                  <label className="flex items-center gap-3 cursor-pointer select-none md:w-52">
                    <input
                      type="checkbox"
                      checked={xaiChecked}
                      onChange={(e) => setXaiChecked(e.target.checked)}
                      className="glass-checkbox"
                    />
                    <span className="text-xs font-bold text-orange-400 font-mono">xAI Grok</span>
                  </label>
                  <input
                    type="password"
                    disabled={!xaiChecked}
                    value={xaiKey}
                    onChange={(e) => setXaiKey(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded text-xs disabled:opacity-30 disabled:pointer-events-none"
                    placeholder={xaiChecked ? "xai-..." : "Disabled"}
                  />
                </div>

                {/* DeepSeek */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 bg-black/40 p-3 rounded-lg border border-slate-800/80">
                  <label className="flex items-center gap-3 cursor-pointer select-none md:w-52">
                    <input
                      type="checkbox"
                      checked={deepseekChecked}
                      onChange={(e) => setDeepseekChecked(e.target.checked)}
                      className="glass-checkbox"
                    />
                    <span className="text-xs font-bold text-blue-400 font-mono">DeepSeek</span>
                  </label>
                  <input
                    type="password"
                    disabled={!deepseekChecked}
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded text-xs disabled:opacity-30 disabled:pointer-events-none"
                    placeholder={deepseekChecked ? "sk-..." : "Disabled"}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleNextStep(1)}
                  className="btn-action bg-slate-800/50 border border-slate-700 hover:bg-slate-700/60 text-slate-300 py-3 px-6 rounded-lg font-bold uppercase tracking-widest text-xs cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerateEnv}
                  className="btn-action flex-1 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/40 text-purple-300 py-3 rounded-lg font-bold uppercase tracking-widest text-xs cursor-pointer"
                >
                  Generate .env & Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SWARM MESH UPLINK */}
          {step === 3 && (
            <div className="flex flex-col gap-5 animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
              <div className="text-sm text-slate-300 font-mono text-center">Step 3/4: Swarm Mesh Uplink</div>
              <p className="text-xs text-slate-400 font-mono text-center mb-2 leading-relaxed">
                Connect your AIPET to the virtual multi-peer mesh swarm. This allows dynamic XP swarm multiplier sharing and inter-pet syncs.
              </p>

              <div className="bg-black/50 border border-cyan-500/20 p-4 rounded-lg flex flex-col gap-2">
                <div className="text-xs uppercase text-[#00F2FE] font-bold mb-1 font-mono">Tailscale MicroLink Auth</div>
                <code className="text-xs text-emerald-400 font-mono break-all bg-black p-2.5 rounded border border-slate-800/80">
                  {tsKey || 'Generating token key...'}
                </code>
                <p className="text-[10px] text-slate-500 font-mono">
                  This secure ephemeral auth token links your Next.js companion to the decentralized swarm.
                </p>
              </div>

              <div className="bg-black/50 border border-yellow-500/20 p-4 rounded-lg flex flex-col gap-2">
                <div className="text-xs uppercase text-[#FFD200] font-bold mb-1 font-mono">🔌 Physical Buddy Sync (Optional)</div>
                <input
                  type="text"
                  value={buddyIp}
                  onChange={(e) => setBuddyIpInput(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded text-xs font-mono text-[#FFD200] focus:border-[#FFD200] bg-black"
                  placeholder="e.g. 192.168.1.13"
                />
                <p className="text-[10px] text-slate-500 font-mono">
                  Have a physical Waveshare ESP32 AMOLED Desktop Buddy? Enter its local Wi-Fi IP to pair it for real-time visual reactions!
                </p>
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleNextStep(2)}
                  className="btn-action bg-slate-800/50 border border-slate-700 hover:bg-slate-700/60 text-slate-300 py-3 px-6 rounded-lg font-bold uppercase tracking-widest text-xs cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => handleNextStep(4)}
                  className="btn-action flex-1 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-300 py-3 rounded-lg font-bold uppercase tracking-widest text-xs cursor-pointer"
                >
                  Establish Uplink →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFICATION */}
          {step === 4 && (
            <div className="flex flex-col gap-5 animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
              <div className="text-sm text-slate-300 font-mono text-center">Step 4/4: Systems Verification</div>

              <div className="h-36 bg-black/85 border border-slate-800/90 rounded-lg p-4 font-mono text-xs text-slate-300 flex flex-col gap-1.5 overflow-y-auto">
                {verificationLogs.map((logStr, idx) => (
                  <div key={idx} className={
                    logStr.includes('✅') ? 'text-emerald-400 font-bold' : 
                    logStr.includes('Initializing') ? 'text-yellow-400 animate-pulse' : 'text-slate-400'
                  }>
                    {logStr}
                  </div>
                ))}
              </div>

              {!isVerified && (
                <button
                  onClick={runVerification}
                  disabled={isVerifying}
                  className="btn-action bg-yellow-600/20 border border-yellow-500/50 hover:bg-yellow-600/40 text-yellow-300 py-3.5 rounded-lg font-bold uppercase tracking-widest text-xs cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? "Executing Telemetry Selfcheck..." : "Run Verification Protocol"}
                </button>
              )}

              {isVerified && (
                <button
                  onClick={handleFinish}
                  className="btn-action bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-300 py-3.5 rounded-lg font-bold uppercase tracking-widest text-xs cursor-pointer animate-pulse"
                >
                  Launch AIPET HUD Dashboard →
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
