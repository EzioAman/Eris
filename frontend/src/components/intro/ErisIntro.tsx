import React, { useEffect, useState } from 'react';
import { Particles } from '../magicui/particles';
import { DiaTextReveal } from '../magicui/dia-text-reveal';
import { TextAnimate } from '../magicui/text-animate';
import { AnimatedShinyText } from '../magicui/animated-shiny-text';
import { AnimatedGradientText } from '../magicui/animated-gradient-text';
import { FadeContent } from '../reactbits/FadeContent';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../ui/alert-dialog';
import { Card } from '../ui/card';
import { ArrowRight, Volume2, VolumeX, Terminal, Layers, LogOut, Sparkles } from 'lucide-react';
import { erisAudio } from '../../lib/audioManager';
import { TemplateGallery } from '../dev/TemplateGallery';
import { checkSessionAndConfig, type SessionConfigStatus } from '../onboarding/authActions';
import { useDevMode } from '../../context/DevModeContext';

export interface ErisIntroProps {
  onComplete?: () => void;
  onOpenGreeting?: (session: SessionConfigStatus, isDev?: boolean) => void;
  onSignOut?: () => void;
}

export const ErisIntro: React.FC<ErisIntroProps> = ({ onComplete, onOpenGreeting, onSignOut }) => {


  const [particlesVisible, setParticlesVisible] = useState(true);
  const [revealReady, setRevealReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [isScreensaver, setIsScreensaver] = useState(false);
  const [audioVisible, setAudioVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(erisAudio.getIsMuted());

  // Dev mode & .env state
  const [hasEnv, setHasEnv] = useState(false);
  const [devReady, setDevReady] = useState(false);
  const [isDevPromptOpen, setIsDevPromptOpen] = useState(false);
  const { isDevMode, setDevMode } = useDevMode();
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // Session status state (non-blocking check on launch)
  const [sessionStatus, setSessionStatus] = useState<SessionConfigStatus | null>(null);

  const hasActiveSession = Boolean(sessionStatus?.isAuthenticated);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#templates') {
        setShowTemplateGallery(true);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
        setShowTemplateGallery((prev) => !prev);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 1. Check for .env and verify session during initial 3 seconds
  useEffect(() => {
    let isMounted = true;

    // Background session integrity check (non-blocking)
    checkSessionAndConfig().then((status) => {
      if (isMounted) {
        setSessionStatus(status);
      }
    });

    // Check backend / Vite middleware endpoint
    fetch('/api/system/check-env')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.hasEnv) {
          setHasEnv(true);
        }
      })
      .catch(() => {
        // Fallback to build-time define
        if (isMounted && typeof __ENV_EXISTS__ !== 'undefined' && __ENV_EXISTS__) {
          setHasEnv(true);
        }
      });

    // Explicit 3-second delay before allowing dev mode display
    const devTimer = setTimeout(() => {
      if (isMounted) {
        setDevReady(true);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(devTimer);
    };
  }, []);

  // 2. Cinematic Intro Sequence
  useEffect(() => {
    const unsubscribe = erisAudio.subscribe(setIsMuted);
    erisAudio.playAmbient();

    // Trigger ambient audio button fade-in right as app starts
    const audioFadeTimer = setTimeout(() => {
      setAudioVisible(true);
    }, 50);

    // Initial short pause on black screen with particles before text reveal begins
    const timer1 = setTimeout(() => {
      setRevealReady(true);
    }, 500);

    // Around 2.2s, particles begin dissolving out
    const timer2 = setTimeout(() => {
      setParticlesVisible(false);
    }, 2200);

    // At 3.2s, intro sequence reaches full completion
    const timer3 = setTimeout(() => {
      setIntroFinished(true);
    }, 3200);

    return () => {
      clearTimeout(audioFadeTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      unsubscribe();
    };
  }, []);

  // 3. Idle Screensaver: 10 seconds of no input brings back background, resumes on any input
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;

    const wakeAndReset = () => {
      setIsScreensaver(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsScreensaver(true);
      }, 10000);
    };

    // Initial 10-second idle countdown on launch
    idleTimer = setTimeout(() => {
      setIsScreensaver(true);
    }, 10000);

    const inputEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    inputEvents.forEach((evt) => window.addEventListener(evt, wakeAndReset, { passive: true }));

    return () => {
      clearTimeout(idleTimer);
      inputEvents.forEach((evt) => window.removeEventListener(evt, wakeAndReset));
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = erisAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  const showParticles = isScreensaver || particlesVisible;

  return (
    <div className="h-screen w-screen min-h-screen w-full bg-black flex flex-col justify-between items-center overflow-hidden select-none relative font-sans">
      {/* Ambient Audio Toggle with React Bits FadeContent */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 z-30">
        <FadeContent
          blur={true}
          duration={600}
          delay={100}
          direction="down"
          distance={10}
          isVisible={audioVisible && !isScreensaver}
        >
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Ambient Audio' : 'Mute Ambient Audio'}
            className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer text-xs sm:text-sm font-medium backdrop-blur-md shadow-lg"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-neutral-400" />
                <span>Ambient Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[#8B5CF6]" />
                <span>Ambient Audio</span>
              </>
            )}
          </button>
        </FadeContent>
      </div>

      {/* 1. Magic UI Particles Layer - active on entry, dissolves after 3s, brings back on 10s idle screensaver */}
      <div
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-out pointer-events-none ${showParticles ? 'opacity-100' : 'opacity-0'
          }`}
      >
        <Particles
          key="particles-layer"
          className="absolute inset-0 size-full"
          quantity={130}
          ease={70}
          color="#ffffff"
          size={0.7}
          refresh={false}
        />
      </div>

      {/* Ambient subtle back-glow on reveal */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[90vw] h-[350px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none transition-opacity duration-1000 ${revealReady ? 'opacity-100' : 'opacity-0'
          }`}
      />

      {/* Spacer for top balance */}
      <div className="h-12 sm:h-16 shrink-0" />

      {/* 2. Central Dramatic Reveal Sequence */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 w-full max-w-5xl my-auto">
        {/* Welcome to - Animated with Magic UI TextAnimate */}
        <div className="min-h-[32px] sm:min-h-[40px] md:min-h-[48px] flex items-center justify-center">
          {revealReady && (
            <TextAnimate
              key="welcome-text"
              animation="blurInUp"
              by="character"
              duration={0.7}
              delay={0.1}
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light tracking-[0.25em] uppercase text-neutral-300"
            >
              Welcome to
            </TextAnimate>
          )}
        </div>

        {/* Big ERIS with Dia Text Reveal */}
        <div className="mt-2 sm:mt-4 md:mt-5 min-h-[80px] sm:min-h-[120px] md:min-h-[160px] lg:min-h-[210px] flex items-center justify-center">
          {revealReady && (
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] font-black tracking-tight text-white leading-none">
              <DiaTextReveal
                key="dia-text"
                text="ERIS"
                duration={2.0}
                delay={0.1}
                colors={['#c679c4', '#fa3d1d', '#ffb005', '#e1e1fe', '#0358f7']}
                textColor="#FFFFFF"
              />
            </h1>
          )}
        </div>

        {/* Action Controls when Intro Completes - with AnimatedGradientText */}
        <div
          className={`mt-8 sm:mt-10 md:mt-12 flex items-center justify-center gap-3 sm:gap-4 transition-all duration-700 ${introFinished && !isScreensaver
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
        >
          {/* 1. If NOT authenticated: Show 'Start your onboarding' */}
          {onComplete && !hasActiveSession && (
            <button
              onClick={onComplete}
              className="group relative inline-flex items-center justify-center rounded-2xl p-[1px] transition-all duration-300 hover:shadow-[0_0_35px_rgba(156,64,255,0.3)] cursor-pointer overflow-hidden active:scale-[0.98]"
            >
              {/* Animated gradient border */}
              <span
                className="absolute inset-0 block h-full w-full animate-gradient rounded-[inherit] bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%]"
                style={{ '--bg-size': '300%' } as React.CSSProperties}
              />
              {/* Inner button surface */}
              <span className="relative flex items-center justify-center rounded-[inherit] bg-neutral-950/90 px-8 py-4 backdrop-blur-md transition-colors group-hover:bg-neutral-900/90">
                <AnimatedGradientText
                  speed={1.2}
                  colorFrom="#ffaa40"
                  colorTo="#9c40ff"
                  className="inline-flex items-center justify-center text-base sm:text-lg font-semibold tracking-wide"
                >
                  Start your onboarding
                </AnimatedGradientText>
                <ArrowRight className="ml-2.5 w-5 h-5 text-[#9c40ff] transition-transform duration-300 ease-in-out group-hover:translate-x-1 group-hover:text-[#ffaa40]" />
              </span>
            </button>
          )}

          {/* 2. If ALREADY authenticated & configured: Show 'Continue where you left off' */}
          {hasActiveSession && sessionStatus && (
            <button
              onClick={() => onOpenGreeting?.(sessionStatus, isDevMode)}
              title="Continue where you left off"
              className="group relative inline-flex items-center justify-center rounded-2xl p-[1px] transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98] hover:shadow-[0_0_35px_rgba(156,64,255,0.3)]"
            >
              {/* Animated gradient border outline */}
              <span
                className="absolute inset-0 block h-full w-full rounded-[inherit] bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] animate-gradient"
                style={{ '--bg-size': '300%' } as React.CSSProperties}
              />
              {/* Inner button surface */}
              <span className="relative flex items-center justify-center rounded-[inherit] bg-neutral-950/90 px-8 py-4 backdrop-blur-md transition-colors group-hover:bg-neutral-900/90 min-w-[220px]">
                <AnimatedGradientText
                  speed={1.2}
                  colorFrom="#ffaa40"
                  colorTo="#9c40ff"
                  className="inline-flex items-center justify-center text-base sm:text-lg font-semibold tracking-wide"
                >
                  Continue where you left off
                </AnimatedGradientText>
              </span>
            </button>
          )}

          {/* 3. Dev Mode quick entrance when NOT authenticated */}
          {!hasActiveSession && hasEnv && isDevMode && (
            <button
              onClick={() => {
                const devSession: SessionConfigStatus = {
                  isAuthenticated: true,
                  isConfigured: true,
                  displayName: 'Developer',
                  email: 'dev@eris.local',
                  token: 'session_local_guest',
                };
                onOpenGreeting?.(devSession, true);
              }}
              title="Enter workspace directly in Dev Mode"
              className="px-5 py-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 transition-all cursor-pointer backdrop-blur-md text-sm font-semibold flex items-center gap-2 active:scale-95"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Dev Workspace</span>
            </button>
          )}

          {/* 4. If authenticated: Show 'Log out' button */}
          {hasActiveSession && onSignOut && (
            <button
              onClick={() => {
                onSignOut();
                setSessionStatus(null);
              }}
              title="Sign out / Log out"
              className="px-5 py-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-all cursor-pointer backdrop-blur-md text-sm font-semibold flex items-center gap-2 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Bottom Footer Attribution in AnimatedShinyText Container */}
      <footer
        className={`relative z-20 pb-6 sm:pb-8 px-4 flex items-center justify-center transition-all duration-700 ease-out ${introFinished && !isScreensaver
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
      >
        <div className="z-10 flex items-center justify-center">
          <a
            href="https://github.com/EzioAman/Eris"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-full border border-white/10 bg-neutral-900/80 px-4 py-1.5 transition-all ease-in hover:cursor-pointer hover:bg-neutral-800/80 hover:border-white/20 backdrop-blur-md"
          >
            <AnimatedShinyText className="inline-flex items-center justify-center gap-2 text-sm sm:text-base font-medium transition ease-out text-neutral-400 group-hover:text-white">
              <svg
                className="w-4 h-4 fill-current shrink-0 text-white"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Created and maintained by: Aman Sinha</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            </AnimatedShinyText>
          </a>
        </div>
      </footer>

      {/* 4. Bottom Right Dev Mode - Card Trigger and React Native Reusables Alert Dialog Template */}
      {hasEnv && (
        <>
          <div className="fixed bottom-6 right-6 z-40">
            <FadeContent
              blur={true}
              duration={800}
              delay={100}
              isVisible={devReady && !isScreensaver}
            >
              <Card
                role="button"
                onClick={() => setIsDevPromptOpen(true)}
                title={isDevMode ? 'Dev Mode Active (.env)' : 'Dev mode Available (.env detected)'}
                className={`p-3 cursor-pointer flex items-center gap-2.5 transition-all duration-200 select-none ${isDevMode
                    ? 'bg-neutral-900 border-violet-500/60 text-white shadow-violet-500/10 shadow-lg'
                    : 'bg-[#121215] hover:bg-[#18181c] border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
              >
                <Terminal className={`w-4 h-4 ${isDevMode ? 'text-violet-400' : 'text-neutral-400'}`} />
                <span className="text-sm font-medium text-neutral-200">
                  {isDevMode ? 'Dev Mode Active' : 'Dev mode Available'}
                </span>
                <span className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-violet-400 animate-pulse' : 'bg-emerald-400'}`} />
              </Card>
            </FadeContent>
          </div>

          {isDevMode && (
            <div className="fixed bottom-20 right-6 z-40">
              <button
                type="button"
                onClick={() => setShowTemplateGallery(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-950/90 border border-violet-500/40 text-violet-200 hover:text-white hover:bg-violet-900/90 text-xs font-medium shadow-xl backdrop-blur-md transition-all cursor-pointer select-none"
                title="Open UI Template Showcase"
              >
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span>UI Templates</span>
              </button>
            </div>
          )}

          <AlertDialog open={isDevPromptOpen} onOpenChange={setIsDevPromptOpen}>
            <AlertDialogContent className="bg-[#0e0e12] border-neutral-800 text-white">
              <AlertDialogHeader>
                <div className="flex items-center justify-between">
                  <AlertDialogTitle>
                    {isDevMode ? 'Developer Menu' : 'Enter Dev Mode?'}
                  </AlertDialogTitle>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    .env detected
                  </span>
                </div>
                <AlertDialogDescription className="text-neutral-400">
                  {isDevMode
                    ? 'Developer Mode is active. You can inspect the design system UI templates or toggle developer mode.'
                    : 'A local environment configuration was identified. Would you like to launch ERIS in Developer Mode?'}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {isDevMode && (
                <div className="py-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDevPromptOpen(false);
                      onComplete?.();
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Start Onboarding Flow</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400">Launch →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDevPromptOpen(false);
                      setShowTemplateGallery(true);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-violet-400" />
                      <span>Explore UI Template Showcase</span>
                    </div>
                    <span className="font-mono text-[11px] text-violet-400">20 Templates →</span>
                  </button>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setIsDevPromptOpen(false)}
                  className="border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setDevMode(!isDevMode);
                    setIsDevPromptOpen(false);
                  }}
                  className="bg-white text-black hover:bg-neutral-200 font-semibold"
                >
                  {isDevMode ? 'Exit Dev Mode' : 'Enter Dev Mode'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {showTemplateGallery && (
        <TemplateGallery
          onClose={() => {
            setShowTemplateGallery(false);
            if (window.location.hash === '#templates') {
              window.history.pushState('', document.title, window.location.pathname + window.location.search);
            }
          }}
        />
      )}
    </div>
  );
};
