import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ShieldCheck, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SkeletonTemplate } from '../../../ui_templates/SkeletonTemplate';
import { ContactPageTemplate } from '../../../ui_templates/ContactPageTemplate';
import { CtaButton } from '../../../ui_templates/LargeCtaButtonTemplate';

export interface MeetTheTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterWorkspace?: () => void;
  isDarkMode?: boolean;
}

export const MeetTheTeamModal: React.FC<MeetTheTeamModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  // Reset loading timer every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setShowContact(false);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none font-sans">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {showContact ? (
          <ContactPageTemplate
            key="contact-page"
            onClose={onClose}
            onBack={() => setShowContact(false)}
            isDarkMode={isDarkMode}
          />
        ) : (
          <motion.div
            key="team-modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl p-4 sm:p-6 border shadow-2xl relative z-10',
              isDarkMode
                ? 'bg-[#0B0F17] border-white/10 text-white shadow-black/80'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
            )}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'absolute top-4 right-4 p-1.5 rounded-xl transition-colors cursor-pointer z-20',
                isDarkMode
                  ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              )}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Section Heading (Compact Untitled UI style) */}
            <div className="text-center max-w-xl mx-auto mb-3 sm:mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-1.5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                <Sparkles className="w-3 h-3" />
                Our Team & Engineering Roster
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Meet the Minds Behind ERIS
              </h2>
              <p className={cn('text-xs mt-1 leading-relaxed', isDarkMode ? 'text-neutral-400' : 'text-slate-600')}>
                A collective of systems architects, neural researchers, and security sentinels dedicated to autonomous computing.
              </p>
            </div>

            {/* SKELETON LOADING PHASE (The Intentional Joke Setup) */}
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 animate-pulse">
                  <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
                  Querying corporate directory and assembling team roster...
                </div>

                {/* 6 Mock Skeleton Member Cards (Compact) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-3 rounded-xl border space-y-2 flex flex-col items-center text-center',
                        isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <SkeletonTemplate className="size-10 rounded-full" />
                      <SkeletonTemplate className="h-3.5 w-24 rounded-md" />
                      <SkeletonTemplate className="h-2.5 w-16 rounded-md opacity-70" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* REVEAL PHASE (The Punchline & Real Team) */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-3 sm:space-y-3.5"
              >
                {/* Humorous Punchline Banner (Compact) */}
                <div
                  className={cn(
                    'rounded-xl p-3 sm:p-3.5 text-center border relative overflow-hidden shadow-xs',
                    isDarkMode
                      ? 'bg-gradient-to-b from-indigo-950/40 via-[#0E1320] to-[#0A0D15] border-indigo-500/30'
                      : 'bg-gradient-to-b from-blue-50 to-white border-blue-200'
                  )}
                >
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 border border-amber-500/30 bg-amber-500/10 text-amber-300">
                    <span>😄</span> Org Chart Update
                  </div>

                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mb-1">
                    Just kidding, it&apos;s just me.
                  </h3>

                  <p className={cn('text-xs max-w-md mx-auto leading-relaxed', isDarkMode ? 'text-neutral-300' : 'text-slate-600')}>
                    No corporate bloat or committees. Just one developer, an autonomous AI companion, and genuine craftsmanship.
                  </p>
                </div>

                {/* The Two Genuine Core Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 1. Aman Sinha Card */}
                  <div
                    className={cn(
                      'p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all hover:border-cyan-500/30 hover:shadow-md',
                      isDarkMode
                        ? 'bg-[#0E1320] border-white/10 shadow-black/40'
                        : 'bg-slate-50 border-slate-200 shadow-slate-200/50'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="size-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                          AS
                        </div>
                        <div>
                          <h4 className="text-sm font-bold">Aman Sinha</h4>
                          <p className="text-[11px] font-semibold text-cyan-400">
                            Creator & Full-Stack Architect
                          </p>
                        </div>
                      </div>

                      <p className={cn('text-xs leading-relaxed mb-2.5', isDarkMode ? 'text-neutral-300' : 'text-slate-600')}>
                        Architected the local execution runtime, multi-provider model routing, and workspace.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
                        Primary Contributor
                      </span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-emerald-400/20" /> Solo Project
                      </span>
                    </div>
                  </div>

                  {/* 2. ERIS Assistant Card */}
                  <div
                    className={cn(
                      'p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all hover:border-indigo-500/30 hover:shadow-md',
                      isDarkMode
                        ? 'bg-[#0E1320] border-white/10 shadow-black/40'
                        : 'bg-slate-50 border-slate-200 shadow-slate-200/50'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="size-10 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0 relative">
                          ❖
                          <span className="size-2 rounded-full bg-emerald-400 ring-2 ring-[#0E1320] absolute -bottom-0.5 -right-0.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold">ERIS</h4>
                          <p className="text-[11px] font-semibold text-indigo-400">
                            AI Pair-Programming Companion
                          </p>
                        </div>
                      </div>

                      <p className={cn('text-xs leading-relaxed mb-2.5', isDarkMode ? 'text-neutral-300' : 'text-slate-600')}>
                        Autonomous multi-turn reasoning, tool execution, and local-first privacy.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
                        AI Companion
                      </span>
                      <span className="font-semibold text-cyan-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Local Privacy
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <p className="text-[11px] text-neutral-400">
                    Built with intentionality, zero AI slop, and local privacy.
                  </p>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        'px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                        isDarkMode
                          ? 'border-white/10 text-neutral-300 hover:text-white hover:bg-white/5'
                          : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      )}
                    >
                      Close
                    </button>

                    {/* Contact Me Button styled with existing session layout */}
                    <div className="w-full sm:w-auto">
                      <CtaButton
                        variant="dark"
                        size="md"
                        glyph="arrow"
                        label="Contact Me"
                        sublabel="Get in touch with Aman"
                        onActivate={() => setShowContact(true)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default MeetTheTeamModal;
