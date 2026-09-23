import React, { useRef, useState, useMemo } from 'react';
import { Compass } from 'lucide-react';
import Strands from '../ui/strands';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import EmilLoadingBar from '../ui/emil-loading-bar';
import type { SessionConfigStatus } from '../onboarding/authActions';
import { BadgeTemplate } from '../../../ui_templates/BadgeTemplate';
import { StepChecklist, type StepCheckItem } from '../../../ui_templates/StepChecklistTemplate';
import { UserMenu } from '../auth/UserMenu';

export interface GreetingPageProps {
  sessionStatus?: SessionConfigStatus;
  isDevMode?: boolean;
  onEnterWorkspace: () => void;
  onOpenOnboarding?: () => void;
  onReturnToIntro?: () => void;
  onSignOut?: () => void;
}

/* ─── Dynamic ERIS Tips Pool (Randomized on each load) ────────────────── */
const ERIS_TIPS = [
  'Use Ctrl+K to quickly open the command palette from anywhere.',
  'You can switch active reasoning and speed models at any time in Model Matrix.',
  'Local tools in tools/ can be executed directly by the assistant during tasks.',
  'Your files and database tables remain stored locally on your machine.',
  'Toggle between speed and accuracy modes depending on task complexity.',
  'Use markdown code blocks to run or review edits before applying them.',
  'Right-click anywhere to access contextual actions, new chat, and paste.',
];

export const GreetingPage: React.FC<GreetingPageProps> = ({
  sessionStatus,
  isDevMode,
  onEnterWorkspace,
  onOpenOnboarding,
  onReturnToIntro,
  onSignOut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userName = sessionStatus?.displayName || sessionStatus?.username || sessionStatus?.email?.split('@')[0] || (isDevMode ? 'Developer' : 'User');
  const [currentTip] = useState(() => ERIS_TIPS[Math.floor(Math.random() * ERIS_TIPS.length)]);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const [failedError, setFailedError] = useState<string | null>(null);

  // Real Workspace Checks with clean, authentic labels
  // Real Workspace Checks with clean, authentic backend integrations
  const subsystemSteps: StepCheckItem[] = useMemo(() => [
    {
      id: 'api',
      before: {
        title: 'Connecting to API server & Database…',
        subtitle: 'Checking local backend and SQLite keystore',
      },
      after: {
        title: 'API Server & Keystore Ready',
        subtitle: 'Local core online (127.0.0.1:5174) with auth.db',
      },
      run: async () => {
        try {
          const res = await fetch('/api/system/health', { signal: AbortSignal.timeout(3500) });
          if (!res.ok) {
            return { ok: false, error: `Backend returned HTTP ${res.status}` };
          }
          const data = await res.json();
          const isOk = Boolean(data?.ok || data?.subsystems?.auth?.status === 'online');
          return { ok: isOk, error: isOk ? undefined : 'Database keystore unavailable' };
        } catch {
          return { ok: false, error: 'Backend offline: ensure backend is running' };
        }
      },
    },
    {
      id: 'vault',
      before: {
        title: 'Validating API Key Vault…',
        subtitle: 'Inspecting encrypted local database keystore',
      },
      after: {
        title: 'Local Vault Active',
        subtitle: 'Encrypted SQLite keystore mounted securely',
      },
      run: async () => {
        try {
          const res = await fetch('/api/keys', { signal: AbortSignal.timeout(3500) });
          if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
          return { ok: true };
        } catch {
          return { ok: false, error: 'Keystore connection refused' };
        }
      },
    },
    {
      id: 'tools',
      before: {
        title: 'Loading registered tools…',
        subtitle: 'Indexing verified tools in tools/ and AST sandbox',
      },
      after: {
        title: 'Registered Tools Ready',
        subtitle: 'Local tools indexed and ready for autonomous tasks',
      },
      run: async () => {
        try {
          const res = await fetch('/api/tools', { signal: AbortSignal.timeout(3500) });
          if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
          const data = await res.json();
          const toolsOk = Boolean(data?.ok || Array.isArray(data?.tools));
          return { ok: toolsOk, error: toolsOk ? undefined : 'Tools directory unreachable' };
        } catch {
          return { ok: false, error: 'Tools registry service offline' };
        }
      },
    },
    {
      id: 'workspace',
      before: {
        title: 'Mounting workspace filesystem…',
        subtitle: 'Checking local project files and tree structure',
      },
      after: {
        title: 'Workspace Ready',
        subtitle: 'Local project directory mounted and active',
      },
      run: async () => {
        try {
          const res = await fetch('/api/workspace/tree', { signal: AbortSignal.timeout(3500) });
          if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
          return { ok: true };
        } catch {
          return { ok: false, error: 'Workspace mount check failed' };
        }
      },
    },
  ], []);

  return (
    <div
      ref={containerRef}
      style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform, opacity' }}
      className="relative min-h-screen w-full flex flex-col justify-between bg-black text-[#F1F5F9] select-none p-4 sm:p-6 md:p-8 overflow-x-hidden font-sans"
    >
      {/* 1. Pure Strands WebGL Background with Electron GPU Optimization */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden [will-change:transform]">
        <Strands
          colors={['#FF4242', '#7C3AED', '#06B6D4', '#EAB308']}
          count={4}
          speed={0.35}
          amplitude={0.9}
          waviness={1.1}
          thickness={0.8}
          glow={2.0}
          scale={1.2}
          opacity={1}
          className="w-full h-full"
        />
      </div>

      {/* 2. Top Header Navigation with UserMenu and Dev Onboarding */}
      <header className="relative z-20 w-full flex items-center justify-between min-h-[44px] px-4 pt-2">
        <div>
          {isDevMode && onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Onboarding (Dev)</span>
            </button>
          )}
        </div>
        {onSignOut && (
          <UserMenu
            sessionStatus={sessionStatus}
            onReturnToIntro={onReturnToIntro}
            onSignOut={onSignOut}
            isDarkMode={true}
          />
        )}
      </header>

      {/* 3. Centered Title */}
      <div className="relative z-20 w-full max-w-4xl mx-auto text-center pt-2 pb-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-sans">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            {userName}
          </span>
        </h1>
      </div>

      {/* 4. Subsystems Verification Checklist (Moved further left & right to frame background logically) */}
      <main className="relative z-20 w-full max-w-[96vw] 2xl:max-w-[1600px] mx-auto flex-1 flex flex-col justify-center my-auto py-2 px-2 sm:px-6 lg:px-12 xl:px-16">
        <StepChecklist
          steps={subsystemSteps}
          splitLayout={true}
          hideCenterCard={true}
          onProgress={(p) => setProgress(p)}
          onError={(err: string | null) => setFailedError(err)}
          onFinished={() => {
            setFailedError(null);
            setIsCompleted(true);
          }}
          autoStart={true}
          className="w-full"
        />
      </main>

      {/* 5. Bottom Section: Perfectly Aligned Tip, Progress Bar, and Enter Workspace Button */}
      <footer className="relative z-20 w-full max-w-[440px] mx-auto flex flex-col items-center gap-3 pt-2 pb-6 px-4">
        {/* Left-Aligned Tip: Positioned above the progress bar with identical container bounds */}
        <div className="w-full flex items-center justify-start gap-2 text-left">
          <BadgeTemplate
            variant="secondary"
            className="px-2 py-0.5 font-semibold text-violet-300 border-violet-500/30 bg-violet-500/15 shrink-0 font-sans text-xs"
          >
            Tip:
          </BadgeTemplate>
          <span className="text-neutral-300 font-sans font-medium text-xs sm:text-sm truncate">
            {currentTip}
          </span>
        </div>

        {/* Game loading progress bar */}
        <div className="w-full flex justify-center py-0.5">
          <EmilLoadingBar
            progress={progress}
            isCompleted={isCompleted}
            isPaused={Boolean(failedError)}
            isFailed={Boolean(failedError)}
            className="w-full"
          />
        </div>

        {/* Enter Workspace / Action button */}
        <Button
          size="lg"
          disabled={!isCompleted}
          onClick={onEnterWorkspace}
          className={cn(
            'w-full max-w-[220px] h-11 px-8 rounded-2xl font-semibold text-sm transition-all font-sans',
            isCompleted
              ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.25)]'
              : failedError
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 cursor-not-allowed opacity-80'
                : 'bg-white/10 text-white/40 cursor-not-allowed opacity-50'
          )}
        >
          {isCompleted ? 'Enter Workspace' : failedError ? 'Subsystem Offline' : 'Please wait...'}
        </Button>
      </footer>
    </div>
  );
};

export default GreetingPage;
