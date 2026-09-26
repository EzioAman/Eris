import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Globe, ExternalLink, Loader2, Code2, Search, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ActiveThinkingState, SearchStepItem } from './chatTypes';
import { resolveSubagentArchetype } from '../../../ui_templates/SubagentChainTemplate';

export interface ClaudeThinkingBlockProps {
  isLive?: boolean;
  activeThinking?: ActiveThinkingState | null;
  reasoningSteps?: { turn: number; thought?: string; actions?: string[]; observations?: string[]; stage?: StageKey }[];
  reasoning?: string;
  searches?: SearchStepItem[];
  switches?: string[];
  durationSeconds?: number;
  isDarkMode?: boolean;
  defaultExpanded?: boolean;
}

// ─── Pipeline stages ───
// Each key corresponds to a real backend signal (a LangGraph node / event
// type), never a random word. Colors double as: dot color, badge color,
// and (while live) each pill's left swatch + border tint.
type StageKey = 'retrieving' | 'pruning' | 'thinking' | 'planning' | 'writing' | 'verifying' | 'acting' | 'delegating' | 'waiting';

const STAGES: Record<StageKey, { label: string; dot: string; text: string; ring: string; bg: string }> = {
  retrieving: { label: 'Retrieving', dot: 'bg-sky-400',    text: 'text-sky-400',    ring: 'border-sky-500/25',    bg: 'bg-sky-500/5' },
  pruning:    { label: 'Pruning',    dot: 'bg-amber-400',  text: 'text-amber-400',  ring: 'border-amber-500/25',  bg: 'bg-amber-500/5' },
  thinking:   { label: 'Thinking',   dot: 'bg-orange-400', text: 'text-orange-400', ring: 'border-orange-500/25', bg: 'bg-orange-500/5' },
  planning:   { label: 'Planning',   dot: 'bg-violet-400', text: 'text-violet-400', ring: 'border-violet-500/25', bg: 'bg-violet-500/5' },
  writing:    { label: 'Writing',    dot: 'bg-emerald-400',text: 'text-emerald-400',ring: 'border-emerald-500/25',bg: 'bg-emerald-500/5' },
  verifying:  { label: 'Verifying',  dot: 'bg-teal-400',   text: 'text-teal-400',   ring: 'border-teal-500/25',   bg: 'bg-teal-500/5' },
  acting:     { label: 'Running',    dot: 'bg-cyan-400',   text: 'text-cyan-400',   ring: 'border-cyan-500/25',   bg: 'bg-cyan-500/5' },
  delegating: { label: 'Delegating', dot: 'bg-purple-400', text: 'text-purple-400', ring: 'border-purple-500/25', bg: 'bg-purple-500/5' },
  waiting:    { label: 'Waiting',    dot: 'bg-rose-400',   text: 'text-rose-400',   ring: 'border-rose-500/25',   bg: 'bg-rose-500/5' },
};

// Fallback so this still looks right before the backend threads a real
// `stage` through — infer from wording until then. Delete once every
// thought/action event carries an explicit stage.
function inferStage(text: string): StageKey {
  const t = text.toLowerCase();
  if (/retriev|search|querying|vector|lookup/.test(t)) return 'retrieving';
  if (/prun|drop|trim|filter|discard/.test(t)) return 'pruning';
  if (/plan|rout|decide|next step/.test(t)) return 'planning';
  if (/writ|implement|generat|draft|refactor/.test(t)) return 'writing';
  if (/verif|test|check|validate/.test(t)) return 'verifying';
  if (/spawn|delegat|subagent/.test(t)) return 'delegating';
  return 'thinking';
}

interface ThoughtStep { text: string; stage: StageKey; }

export const ClaudeThinkingBlock: React.FC<ClaudeThinkingBlockProps> = ({
  isLive = false,
  activeThinking,
  reasoningSteps = [],
  reasoning = '',
  searches = [],
  switches = [],
  durationSeconds,
  isDarkMode = true,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [timerCount, setTimerCount] = useState<number>(0);

  useEffect(() => {
    if (!isLive) return;
    const start = activeThinking?.startTime || Date.now();
    const interval = setInterval(() => setTimerCount(Math.max(1, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(interval);
  }, [isLive, activeThinking?.startTime]);

  const displaySeconds = isLive ? timerCount : (durationSeconds ?? (reasoningSteps.length > 0 ? reasoningSteps.length * 2 : 4));

  const activeSwitches = (activeThinking?.switches && activeThinking.switches.length > 0) ? activeThinking.switches : switches;

  const allSearches: SearchStepItem[] = useMemo(() => {
    if (activeThinking?.searches && activeThinking.searches.length > 0) return activeThinking.searches;
    return searches;
  }, [activeThinking?.searches, searches]);

  // Normalize thoughts into {text, stage} regardless of whether the
  // backend has been updated to send an explicit stage yet.
  const thoughts: ThoughtStep[] = useMemo(() => {
    const liveThoughts = activeThinking?.thoughts && activeThinking.thoughts.length > 0
      ? activeThinking.thoughts.map((t, i) => ({ text: t, stage: (activeThinking as any).thoughtStages?.[i] as StageKey | undefined }))
      : reasoningSteps.map(s => ({ text: s.thought || '', stage: s.stage })).filter(t => t.text);

    return liveThoughts
      .filter(t => {
        const lower = t.text.toLowerCase();
        if (lower.includes('evaluating workspace state and planning next actions')) return false;
        if (lower.startsWith('step ') && lower.length < 20) return false;
        return true;
      })
      .map(t => ({ text: t.text, stage: t.stage || inferStage(t.text) }));
  }, [activeThinking?.thoughts, (activeThinking as any)?.thoughtStages, reasoningSteps]);

  const latest = thoughts[thoughts.length - 1];
  const currentStage: StageKey = latest?.stage || 'thinking';
  const stageInfo = STAGES[currentStage];

  const headline = isLive
    ? (latest?.text || 'Starting up…')
    : (latest?.text || 'Deliberated on your request.');

  const subagentActions = useMemo(() => {
    const actions = (activeThinking?.actions && activeThinking.actions.length > 0) ? activeThinking.actions : reasoningSteps.flatMap(s => s.actions || []);
    return actions.filter(a => a.startsWith('SPAWN_AGENT')).map(a => {
      const spec = a.replace(/^SPAWN_AGENT\s*/, '');
      const [role, objective] = spec.split('|');
      return { role: role || 'Subagent', objective: objective || spec };
    });
  }, [activeThinking?.actions, reasoningSteps]);

  const toolActions = useMemo(() => {
    const actions = (activeThinking?.actions && activeThinking.actions.length > 0) ? activeThinking.actions : reasoningSteps.flatMap(s => s.actions || []);
    return actions.filter(a => !a.startsWith('SPAWN_AGENT')).map(a => a.replace(/^CALL_TOOL\s*/i, '').trim()).filter(Boolean);
  }, [activeThinking?.actions, reasoningSteps]);

  const searchCount = allSearches.length;

  return (
    <div className="my-1.5 select-text font-sans w-full">
      {/* ── Header row ── */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className={cn(
          'w-full flex items-center gap-2 py-1 text-left cursor-pointer select-none',
          isDarkMode ? 'hover:opacity-90' : 'hover:opacity-80'
        )}
      >
        {/* Live: pulsing dual dot in the current stage's color. Finished: static muted dot. */}
        <span className="flex items-center gap-[3px] shrink-0">
          <span className={cn('size-[5px] rounded-full', isLive ? cn(stageInfo.dot, 'animate-pulse') : (isDarkMode ? 'bg-neutral-500' : 'bg-neutral-400'))} />
          <span className={cn('size-[5px] rounded-full', isLive ? cn(stageInfo.dot, 'animate-pulse [animation-delay:150ms]') : (isDarkMode ? 'bg-neutral-500' : 'bg-neutral-400'))} />
        </span>

        {/* State-word badge — only shown while live; gone once finished. */}
        {isLive && (
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn('text-[11px] font-semibold shrink-0 w-[64px]', stageInfo.text)}
            >
              {stageInfo.label}
            </motion.span>
          </AnimatePresence>
        )}

        {/* Crossfading summary — current thought while live, last thought once finished. */}
        <span className="relative flex-1 min-w-0 h-[18px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={headline}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn('absolute inset-0 text-xs truncate', isDarkMode ? 'text-neutral-300' : 'text-neutral-700')}
            >
              {headline}
            </motion.span>
          </AnimatePresence>
        </span>

        {/* Elapsed time — inline in the header only while live. */}
        {isLive && (
          <span className={cn('text-[11px] shrink-0', isDarkMode ? 'text-neutral-500' : 'text-neutral-400')}>
            {displaySeconds}s
          </span>
        )}

        <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-200', isExpanded && 'rotate-90', isDarkMode ? 'text-neutral-500' : 'text-neutral-400')} />

        {activeSwitches.length > 0 && (
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0', isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
            Auto-switched ({activeSwitches.length})
          </span>
        )}
      </button>

      {/* ── Expanded panel ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={cn('ml-[19px] pl-3 border-l py-2 space-y-2.5 text-xs', isDarkMode ? 'border-neutral-800 text-neutral-300' : 'border-neutral-200 text-neutral-700')}>

              {!isLive && (
                <div className={cn('text-[11px]', isDarkMode ? 'text-neutral-500' : 'text-neutral-400')}>
                  Thought for {displaySeconds}s
                </div>
              )}

              {activeSwitches.map((m, idx) => (
                <div key={`sw-${idx}`} className={cn('p-2 rounded-lg border flex items-center gap-2 text-[11px]', isDarkMode ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300' : 'border-blue-200 bg-blue-50 text-blue-800')}>
                  <span className="font-semibold">❖ Auto-switched to live model:</span>
                  <span className="font-mono underline">{m}</span>
                </div>
              ))}

              {subagentActions.map((sa, idx) => {
                const meta = resolveSubagentArchetype(sa.role);
                const SvgComp = meta.svg;
                return (
                  <div key={`sa-${idx}`} className={cn('p-3 rounded-xl border flex flex-col gap-2 text-xs', isDarkMode ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-violet-200 bg-violet-50/80 text-violet-900')}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <SvgComp className="w-5 h-5 shrink-0" isThinking={isLive} />
                        <span className="font-bold text-xs">Spawned Subagent:</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border border-violet-400/40 bg-violet-500/20 text-violet-300">{meta.title}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">Active Swarm</span>
                    </div>
                    <div className="text-[11px] opacity-90 leading-relaxed font-mono bg-black/20 dark:bg-black/40 p-2 rounded-lg border border-white/5">
                      <span className="text-neutral-400">Assigned Task: </span><span className="text-white font-medium">{sa.objective}</span>
                    </div>
                  </div>
                );
              })}

              {toolActions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {toolActions.map((rawAct, idx) => {
                    const act = rawAct.replace(/^CALL_TOOL\s*/i, '').trim();
                    const spaceIdx = act.indexOf(' ');
                    const name = spaceIdx > -1 ? act.slice(0, spaceIdx) : act;
                    const arg = spaceIdx > -1 ? act.slice(spaceIdx + 1).trim() : '';
                    const isCmd = name.includes('command') || name.includes('bash');
                    const isFind = name.includes('grep') || name.includes('search');
                    const isWeb = name.includes('browser') || name.includes('url') || name.includes('fetch');
                    return (
                      <span key={`act-${idx}`} className={cn('inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded-md border', isDarkMode ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800')} title={act}>
                        {isCmd ? <Terminal className="w-3 h-3 text-emerald-400 shrink-0" /> : isFind ? <Search className="w-3 h-3 text-sky-400 shrink-0" /> : isWeb ? <Globe className="w-3 h-3 text-blue-400 shrink-0" /> : <Code2 className="w-3 h-3 text-cyan-400 shrink-0" />}
                        <span className="font-semibold uppercase tracking-tight text-[10px]">{name}</span>
                        {arg && <span className="truncate max-w-[200px] opacity-80">{arg}</span>}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Reasoning log:
                  - Live: each thought is its own bordered, color-swatched pill, entering with a rise animation.
                  - Finished: plain unstyled lines, no border/color — a calm transcript, not a live feed. */}
              {thoughts.length > 0 ? (
                <div className={isLive ? 'flex flex-col gap-2' : 'space-y-2.5'}>
                  {thoughts.map((t, i) => {
                    const s = STAGES[t.stage];
                    if (isLive) {
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2', s.bg, s.ring)}
                        >
                          <span className={cn('size-1.5 rounded-full shrink-0', s.dot)} />
                          <span className="flex-1 text-[13px] leading-relaxed opacity-90">{t.text}</span>
                          <span className={cn('text-[10px] font-semibold shrink-0', s.text)}>{s.label}</span>
                        </motion.div>
                      );
                    }
                    return (
                      <div key={i} className="text-[13px] leading-relaxed opacity-90 font-sans">
                        {t.text}
                      </div>
                    );
                  })}
                </div>
              ) : isLive ? (
                <div className="text-[12px] text-neutral-400 italic flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /><span>Synthesizing plan &amp; actions…</span>
                </div>
              ) : (
                <div className="text-[12px] text-neutral-400 italic">
                  {subagentActions.length > 0 || toolActions.length > 0 ? 'Evaluated plan and executed assigned tool actions.' : 'Deliberated on user request and formulated direct response.'}
                </div>
              )}

              {allSearches.length > 0 && (
                <div className="space-y-2 pt-1">
                  {allSearches.map((s, sIdx) => (
                    <div key={sIdx} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[12px]">
                        <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-mono text-neutral-300">"{s.query}"</span>
                        {s.status === 'searching' && <Loader2 className="w-3 h-3 animate-spin text-neutral-400 shrink-0" />}
                      </div>
                      {s.results && s.results.length > 0 && (
                        <div className="pl-5 space-y-1">
                          {s.results.map((res, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-2 text-[11px]">
                              <span className="size-1 rounded-full bg-neutral-600 shrink-0" />
                              {res.url ? (
                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-neutral-300 truncate max-w-md flex items-center gap-1">
                                  <span>{res.title || res.domain}</span><ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              ) : (
                                <span className="truncate max-w-md text-neutral-300">{res.title || res.domain}</span>
                              )}
                              {res.domain && res.domain !== 'web' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-neutral-400">{res.domain}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {searchCount > 0 && !isLive && (
                <div className={cn('text-[11px]', isDarkMode ? 'text-neutral-500' : 'text-neutral-400')}>
                  Searched {searchCount} source{searchCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
