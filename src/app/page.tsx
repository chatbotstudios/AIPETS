'use client';

import React, { useEffect, useState } from 'react';
import { useAppState } from '@/lib/store';
import OnboardingWizard from '@/components/hud/OnboardingWizard';
import AIPETHUD from '@/components/hud/AIPETHUD';

export default function Home() {
  const store = useAppState();
  const [hydrated, setHydrated] = useState(false);

  // Sync state with localstorage on mount
  useEffect(() => {
    store.loadFromLocalStorage();
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="crt-overlay min-h-screen text-slate-100 flex items-center justify-center bg-[#05060b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#00F2FE] border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#00F2FE] animate-pulse">Syncing NVS parameters...</span>
        </div>
      </div>
    );
  }

  const handleOnboardingComplete = () => {
    // Force reload/hydrating to guarantee fresh store state is ready
    store.loadFromLocalStorage();
  };

  return (
    <div className="crt-overlay min-h-screen text-slate-100 p-4 md:p-8 relative select-none bg-[#05060b] flex flex-col justify-start items-center">
      {/* Glowing neon background elements */}
      <div className="glow-spot glow-cyan"></div>
      <div className="glow-spot glow-purple"></div>

      {/* Awakening Wizard Overlay if not onboarded */}
      {!store.isOnboarded ? (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      ) : (
        <AIPETHUD />
      )}
    </div>
  );
}
