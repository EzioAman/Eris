import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Globe, ExternalLink, Loader2, Code2, Shield, Search, CheckCircle2, Sparkles, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ActiveThinkingState, SearchStepItem } from './chatTypes';

export interface ClaudeThinkingBlockProps {
  isLive?: boolean;
  activeThinking?: ActiveThinkingState | null;
  reasoningSteps?: { turn: number; thought?: string; actions?: string[]; observations?: string[] }[];
  reasoning?: string;
  searches?: SearchStepItem[];
  switches?: string[];
  durationSeconds?: number;
  isDarkMode?: boolean;
  defaultExpanded?: boolean;
}

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

  // Live timer for ongoing thinking
  useEffect(() => {
    if (!isLive) return;
    const start = activeThinking?.startTime || Date.now();
    const interval = setInterval(() => {
      setTimerCount(Math.max(1, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, activeThinking?.startTime]);

  const displaySeconds = isLive
    ? timerCount
    : (durationSeconds ?? (reasoningSteps.length > 0 ? reasoningSteps.length * 2 : 4));

  const activeSwitches = (activeThinking?.switches && activeThinking.switches.length > 0)
    ? activeThinking.switches
    : switches;

  // Resolve searches (live stream or finalized)
  const allSearches: SearchStepItem[] = useMemo(() => {
    if (activeThinking?.searches && activeThinking.searches.length > 0) {
      return activeThinking.searches;
    }
    return searches;
  }, [activeThinking?.searches, searches]);

  // Extract clean reasoning text, filtering out mechanical boilerplate
  const cleanReasoning = useMemo(() => {
    const raw = activeThinking?.reasoning || reasoning || '';
    if (raw.trim()) {
      return raw.trim();
    }

    // Fallback to non-mechanical thoughts from reasoningSteps (for backward compatibility)
    const thoughts = (activeThinking?.thoughts && activeThinking.thoughts.length > 0)
      ? activeThinking.thoughts
      : reasoningSteps.map(s => s.thought || '').filter(Boolean);

    const filtered = thoughts.filter(t => {
      const lower = t.toLowerCase();
      if (lower.includes('evaluating workspace state and planning next actions')) return false;
      if (lower.startsWith('step ') && lower.length < 20) return false;
      return true;
    });

    return filtered.join('\n\n').trim();
  }, [activeThinking?.reasoning, activeThinking?.thoughts, reasoning, reasoningSteps]);

  // Extract any subagent actions
  const subagentActions = useMemo(() => {
    const actions = (activeThinking?.actions && activeThinking.actions.length > 0)
      ? activeThinking.actions
      : reasoningSteps.flatMap(s => s.actions || []);

    return actions
      .filter(act => act.startsWith('SPAWN_AGENT'))
      .map(act => {
        const spec = act.replace(/^SPAWN_AGENT\s*/, '');
        const parts = spec.split('|');
        return {
          role: parts[0] || 'Subagent',
          objective: parts[1] || spec,
        };
      });
  }, [activeThinking?.actions, reasoningSteps]);

  // Extract non-subagent tool actions (e.g. open_youtube_on_user_browser, etc.)
  const toolActions = useMemo(() => {
    const actions = (activeThinking?.actions && activeThinking.actions.length > 0)
      ? activeThinking.actions
      : reasoningSteps.flatMap(s => s.actions || []);

    return actions
      .filter(act => !act.startsWith('SPAWN_AGENT'))
      .map(act => act.replace(/^CALL_TOOL\s*/i, '').trim())
      .filter(Boolean);
  }, [activeThinking?.actions, reasoningSteps]);

  const searchCount = allSearches.length;

  return (
    <div className="my-1.5 select-text font-sans w-full">
      {/* Slim Activity Row: ⌄ • Thought for Xs · searched Y sources */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          'w-full flex items-center gap-1.5 py-1 text-xs text-left cursor-pointer transition-colors select-none',
          isDarkMode
            ? 'text-neutral-400 hover:text-neutral-200'
            : 'text-neutral-600 hover:text-neutral-900'
        )}
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-90',
            isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
          )}
        />
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0 transition-colors',
            isLive
              ? 'bg-amber-400 animate-pulse'
              : isDarkMode ? 'bg-neutral-500' : 'bg-neutral-400'
          )}
        />
        <span className="font-medium truncate">
          {isLive ? `Thinking (${displaySeconds}s)…` : `Thought for ${displaySeconds}s`}
          {searchCount > 0 && (
            <span className="opacity-70 font-normal">
              {' · '}searched {searchCount} source{searchCount > 1 ? 's' : ''}
            </span>
          )}
        </span>

        {/* Dynamic Model Switch Pill */}
        {activeSwitches.length > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ml-1',
              isDarkMode
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            )}
          >
            Auto-switched ({activeSwitches.length})
          </span>
        )}
      </button>

      {/* Expanded Reasoning & Search Log (ActivityLog) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'ml-[19px] pl-3 border-l py-2 space-y-3 text-xs transition-colors',
                isDarkMode ? 'border-neutral-800 text-neutral-300' : 'border-neutral-200 text-neutral-700'
              )}
            >
              {/* Dynamic Model Switch Notices */}
              {activeSwitches.map((m, idx) => (
                <div
                  key={`sw-${idx}`}
                  className={cn(
                    'p-2 rounded-lg border flex items-center gap-2 text-[11px]',
                    isDarkMode
                      ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                  )}
                >
                  <span className="font-semibold">❖ Auto-switched to live model:</span>
                  <span className="font-mono underline">{m}</span>
                </div>
              ))}

              {/* Subagent Swarm Delegation */}
              {subagentActions.map((sa, idx) => {
                const r = sa.role.toLowerCase();
                const icon = r.includes('code') || r.includes('dev') ? (
                  <Code2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                ) : r.includes('sec') || r.includes('audit') ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : r.includes('research') || r.includes('search') ? (
                  <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : r.includes('test') || r.includes('verify') ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                );

                return (
                  <div
                    key={`sa-${idx}`}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col gap-2 text-xs transition-all shadow-xs',
                      isDarkMode
                        ? 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                        : 'border-violet-200 bg-violet-50/80 text-violet-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-bold text-xs">Spawned Subagent:</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border border-violet-400/40 bg-violet-500/20 text-violet-300">
                          {sa.role}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                        Active Swarm
                      </span>
                    </div>
                    <div className="text-[11px] opacity-90 leading-relaxed font-mono bg-black/20 dark:bg-black/40 p-2 rounded-lg border border-white/5">
                      <span className="text-neutral-400">Assigned Task: </span>
                      <span className="text-white font-medium">{sa.objective}</span>
                    </div>
                  </div>
                );
              })}

              {/* Function / Tool Invocations Markup */}
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
                      <span
                        key={`act-${idx}`}
                        className={cn(
                          'inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded-md border transition-colors select-text',
                          isDarkMode
                            ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
                            : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                        )}
                        title={act}
                      >
                        {isCmd ? (
                          <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : isFind ? (
                          <Search className="w-3 h-3 text-sky-400 shrink-0" />
                        ) : isWeb ? (
                          <Globe className="w-3 h-3 text-blue-400 shrink-0" />
                        ) : (
                          <Code2 className="w-3 h-3 text-cyan-400 shrink-0" />
                        )}
                        <span className="font-semibold uppercase tracking-tight text-[10px]">{name}</span>
                        {arg && (
                          <span className="truncate max-w-[200px] opacity-80">{arg}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Live Action Pill */}
              {isLive && activeThinking?.currentAction && (
                <div
                  className={cn(
                    'p-2 rounded-lg border flex items-center gap-2 text-[11px] animate-pulse',
                    isDarkMode
                      ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-300'
                      : 'border-indigo-200 bg-indigo-50/50 text-indigo-800'
                  )}
                >
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>{activeThinking.currentAction}</span>
                </div>
              )}

              {/* Authentic Reasoning Text */}
              {cleanReasoning ? (
                <div className="leading-relaxed whitespace-pre-wrap text-[13px] opacity-90 font-sans">
                  {cleanReasoning}
                </div>
              ) : isLive ? (
                <div className="text-[12px] text-neutral-400 italic flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Synthesizing plan & actions…</span>
                </div>
              ) : null}

              {/* Web Searches Trace (Globe Icon + Query + Results) */}
              {allSearches.length > 0 && (
                <div className="space-y-2 pt-1">
                  {allSearches.map((s, sIdx) => (
                    <div key={sIdx} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[12px]">
                        <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-mono text-neutral-300">"{s.query}"</span>
                        {s.status === 'searching' && (
                          <Loader2 className="w-3 h-3 animate-spin text-neutral-400 shrink-0" />
                        )}
                      </div>

                      {s.results && s.results.length > 0 && (
                        <div className="pl-5 space-y-1">
                          {s.results.map((res, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-2 text-[11px]">
                              <span className="size-1 rounded-full bg-neutral-600 shrink-0" />
                              {res.url ? (
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline text-neutral-300 truncate max-w-md flex items-center gap-1"
                                >
                                  <span>{res.title || res.domain}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              ) : (
                                <span className="truncate max-w-md text-neutral-300">
                                  {res.title || res.domain}
                                </span>
                              )}
                              {res.domain && res.domain !== 'web' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-neutral-400">
                                  {res.domain}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
