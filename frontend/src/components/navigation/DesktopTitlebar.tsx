import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Volume2, VolumeX } from 'lucide-react';
import { erisAudio } from '../../lib/audioManager';

interface ElectronAPI {
  isElectron?: boolean;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  quit?: () => void;
  quitApp?: () => void;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const DesktopTitlebar: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMuted, setIsMuted] = useState(erisAudio.getIsMuted());

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      window.electronAPI.isMaximized().then(setIsMaximized);
    }
    const unsub = erisAudio.subscribe(setIsMuted);
    return unsub;
  }, []);

  if (!isElectron) {
    return null;
  }

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = async () => {
    window.electronAPI?.maximize();
    const max = await window.electronAPI?.isMaximized();
    setIsMaximized(!!max);
  };
  const handleClose = () => {
    if (window.electronAPI?.quitApp) {
      window.electronAPI.quitApp();
    } else if (window.electronAPI?.close) {
      window.electronAPI.close();
    }
  };

  return (
    <div
      className="w-full h-9 shrink-0 z-[9999] flex items-center justify-between px-3.5 bg-[var(--bg-workspace,#080A10)]/95 backdrop-blur-2xl border-b border-[var(--border-workspace,rgba(255,255,255,0.08))] select-none shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App Branding with ERIS Neon Diamond & Kernel Status */}
      <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-200">
        <span className="relative flex items-center justify-center size-4 text-[var(--accent-primary,#8B5CF6)]">
          <span className="absolute inset-0 rounded-full bg-[var(--accent-primary,#8B5CF6)]/30 blur-[4px] animate-pulse" />
          <span className="relative text-[12px] leading-none">❖</span>
        </span>
        <span className="tracking-widest text-[11px] font-mono text-[var(--text-primary,#F8FAFC)] font-bold">
          ERIS
        </span>
        <span className="px-1.5 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-[10px] font-mono font-semibold text-violet-300 uppercase tracking-wider">
          BETA
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
            Desktop OS
          </span>
        </div>
      </div>

      {/* Draggable spacer */}
      <div className="flex-1 h-full" />

      {/* ERIS Themed Window Controls Capsule */}
      <div
        className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Audio Mute / Unmute Button - Linked to ERIS Audio */}
        <button
          onClick={() => {
            const next = erisAudio.toggleMute();
            setIsMuted(next);
          }}
          className="group relative size-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-violet-300 hover:bg-violet-500/15 border border-transparent hover:border-violet-500/40 transition-all duration-150 active:scale-90"
          title={isMuted ? "Unmute Ambient Sound" : "Mute Ambient Sound"}
          aria-label={isMuted ? "Unmute Ambient Sound" : "Mute Ambient Sound"}
        >
          {isMuted ? (
            <VolumeX className="relative size-3.5 stroke-[2] text-neutral-500 group-hover:text-neutral-300" />
          ) : (
            <Volume2 className="relative size-3.5 stroke-[2] text-violet-400 group-hover:text-violet-300" />
          )}
        </button>

        <div className="w-[1px] h-3.5 bg-white/10 my-auto" />

        {/* Minimize Button - Ambient Cyan Glow */}
        <button
          onClick={handleMinimize}
          className="group relative size-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/40 transition-all duration-150 active:scale-90 active:bg-cyan-500/25"
          title="Minimize Window"
          aria-label="Minimize Window"
        >
          <span className="absolute inset-0 rounded-md bg-cyan-400/0 group-hover:bg-cyan-400/10 blur-[4px] transition-all" />
          <Minus className="relative size-3.5 stroke-[2.2] group-hover:scale-105 transition-transform" />
        </button>

        {/* Maximize / Restore Button - Ambient Violet Glow */}
        <button
          onClick={handleMaximize}
          className="group relative size-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-purple-300 hover:bg-purple-500/15 border border-transparent hover:border-purple-500/40 transition-all duration-150 active:scale-90 active:bg-purple-500/25"
          title={isMaximized ? 'Restore Window' : 'Maximize Window'}
          aria-label={isMaximized ? 'Restore Window' : 'Maximize Window'}
        >
          <span className="absolute inset-0 rounded-md bg-purple-400/0 group-hover:bg-purple-400/10 blur-[4px] transition-all" />
          {isMaximized ? (
            <Copy className="relative size-2.5 stroke-[2] group-hover:scale-105 transition-transform" />
          ) : (
            <Square className="relative size-2.5 stroke-[2] group-hover:scale-105 transition-transform" />
          )}
        </button>

        {/* Close Button - Ambient Crimson / Rose Glow */}
        <button
          onClick={handleClose}
          className="group relative size-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-rose-200 hover:bg-rose-500/25 border border-transparent hover:border-rose-500/50 transition-all duration-150 active:scale-90 active:bg-rose-500/35"
          title="Quit ERIS"
          aria-label="Quit ERIS"
        >
          <span className="absolute inset-0 rounded-md bg-rose-500/0 group-hover:bg-rose-500/15 blur-[4px] transition-all" />
          <X className="relative size-3.5 stroke-[2.2] group-hover:scale-105 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default DesktopTitlebar;
