import React, { useState, useEffect, useMemo } from 'react';
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
  durationSeconds,
  isDarkMode = true,
  defaultExpanded,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded ?? isLive);
  const [elapsed, setElapsed] = useState<number>(0);

  // Elapsed-seconds clock, active while thinking is live
  useEffect(() => {
    if (!isLive) return;
    const start = activeThinking?.startTime || Date.now();
    const id = setInterval(() => {
      setElapsed(Math.max(1, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [isLive, activeThinking?.startTime]);

  // Extract thoughts from activeThinking or reasoningSteps
  const thoughts: string[] = useMemo(() => {
    if (activeThinking?.thoughts && activeThinking.thoughts.length > 0) {
      return activeThinking.thoughts.filter(Boolean);
    }
    if (reasoningSteps && reasoningSteps.length > 0) {
      const list = reasoningSteps.map((s) => s.thought || '').filter(Boolean);
      if (list.length > 0) return list;
    }
    if (reasoning && reasoning.trim()) {
      return reasoning
        .split(/\n\n+/)
        .map((r) => r.trim())
        .filter(Boolean);
    }
    return [];
  }, [activeThinking?.thoughts, reasoningSteps, reasoning]);

  const latestThought = thoughts[thoughts.length - 1] || '';

  // Expand automatically when thinking begins
  useEffect(() => {
    if (isLive) {
      setIsExpanded(true);
    }
  }, [isLive]);

  const displaySeconds = isLive
    ? elapsed
    : (durationSeconds ?? (elapsed > 0 ? elapsed : Math.max(1, thoughts.length * 2)));

  const textColor = isDarkMode ? '#87888b' : '#64748b';
  const borderColor = isDarkMode ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.12)';

  const subagentActions = useMemo(() => {
    const actions =
      activeThinking?.actions && activeThinking.actions.length > 0
        ? activeThinking.actions
        : reasoningSteps.flatMap((s) => s.actions || []);
    return actions
      .filter((a) => a.startsWith('SPAWN_AGENT'))
      .map((a) => {
        const spec = a.replace(/^SPAWN_AGENT\s*/, '');
        const [role, objective] = spec.split('|');
        return { role: role || 'Subagent', objective: objective || spec };
      });
  }, [activeThinking?.actions, reasoningSteps]);

  const toolActions = useMemo(() => {
    const actions =
      activeThinking?.actions && activeThinking.actions.length > 0
        ? activeThinking.actions
        : reasoningSteps.flatMap((s) => s.actions || []);
    return actions
      .filter((a) => !a.startsWith('SPAWN_AGENT'))
      .map((a) => a.replace(/^CALL_TOOL\s*/i, '').trim())
      .filter(Boolean);
  }, [activeThinking?.actions, reasoningSteps]);

  // If there are no thoughts, no reasoning, and not live, don't show an empty box
  if (!isLive && thoughts.length === 0 && subagentActions.length === 0 && toolActions.length === 0) {
    return null;
  }

  // Live mode renders every already-arrived thought as settled text, plus the
  // in-progress last one rendered as-is with a caret. The backend delivers it
  // incrementally, so no client-side typewriter is needed or wanted here —
  // stacking one on top of already-incremental data is what caused the
  // restart-from-zero stutter. React just re-renders the growing string as
  // new characters arrive, which reads as typing for free.
  const settledThoughts = isLive && thoughts.length > 1 ? thoughts.slice(0, -1) : thoughts;
  const liveThought = isLive ? latestThought : '';

  return (
    <div style={styles.body}>
      <div style={styles.wrap}>
        {/* Header row */}
        <div
          style={{ ...styles.thead, color: textColor }}
          onClick={() => setIsExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsExpanded((v) => !v)}
        >
          {isLive && (
            <span style={styles.dots}>
              <Dot delay={0} color={textColor} />
              <Dot delay={150} color={textColor} />
              <Dot delay={300} color={textColor} />
            </span>
          )}

          <span>{isLive ? 'Thinking' : `Thought for ${displaySeconds}s`}</span>

          <span
            style={{
              ...styles.chev,
              borderRightColor: textColor,
              borderBottomColor: textColor,
              transform: isExpanded
                ? 'rotate(-135deg) translateY(1px)'
                : 'rotate(45deg) translateY(-1px)',
            }}
          />
        </div>

        {/* Expandable Reasoning Panel */}
        <div
          style={{
            ...styles.panel,
            maxHeight: isExpanded ? 600 : 0,
          }}
        >
          <div
            style={{
              ...styles.reasoning,
              borderLeftColor: borderColor,
              color: textColor,
            }}
          >
            {/* Completed thoughts */}
            {settledThoughts.map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? '0 0 10px 0' : '10px 0' }}>
                {p}
              </p>
            ))}

            {/* Currently streaming thought — rendered directly, no local typewriter */}
            {isLive && liveThought && (
              <p style={{ margin: settledThoughts.length === 0 ? '0 0 10px 0' : '10px 0' }}>
                {liveThought}
                <Caret color={textColor} />
              </p>
            )}

            {/* Subagent and tool execution context */}
            {subagentActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 not-italic">
                {subagentActions.map((sub, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border"
                    style={{
                      borderColor,
                      background: isDarkMode ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)',
                    }}
                  >
                    <span>❖</span>
                    <span>{sub.role}:</span>
                    <span className="opacity-80 truncate max-w-[200px]">{sub.objective}</span>
                  </span>
                ))}
              </div>
            )}

            {toolActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 not-italic">
                {toolActions.map((act, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border"
                    style={{
                      borderColor,
                      background: isDarkMode ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.03)',
                    }}
                  >
                    <span>⚡</span>
                    <span className="truncate max-w-[240px]">{act}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeThinkingBlock;

function Dot({ delay, color = '#87888b' }: { delay: number; color?: string }) {
  return (
    <i
      style={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        animation: `reasoning-breathe 1s ease-in-out ${delay}ms infinite`,
      }}
    />
  );
}

function Caret({ color = '#87888b' }: { color?: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 1.5,
        height: 13,
        background: color,
        marginLeft: 2,
        verticalAlign: -2,
        animation: 'reasoning-blink .9s step-start infinite',
      }}
    />
  );
}

if (typeof document !== 'undefined' && !document.getElementById('reasoning-trace-kf')) {
  const style = document.createElement('style');
  style.id = 'reasoning-trace-kf';
  style.textContent = `
    @keyframes reasoning-breathe { 0%,100%{ opacity:.25; } 50%{ opacity:.9; } }
    @keyframes reasoning-blink { 50%{ opacity:0; } }
    @media (prefers-reduced-motion: reduce) {
      [style*="reasoning-breathe"], [style*="reasoning-blink"] { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    display: 'flex',
    padding: '4px 0 10px 0',
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    width: '100%',
  },
  wrap: { width: '100%' },
  thead: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: 13.5,
    fontWeight: 500,
  },
  dots: { display: 'inline-flex', gap: 3 },
  chev: {
    width: 6,
    height: 6,
    borderRight: '1.4px solid #87888b',
    borderBottom: '1.4px solid #87888b',
    transition: 'transform .3s cubic-bezier(.16,1,.3,1)',
    flexShrink: 0,
    marginLeft: 1,
  },
  panel: {
    overflow: 'hidden',
    transition: 'max-height .4s cubic-bezier(.16,1,.3,1)',
  },
  reasoning: {
    marginTop: 10,
    paddingLeft: 12,
    borderLeft: '2px solid rgba(255,255,255,.09)',
    fontSize: 13.5,
    lineHeight: 1.65,
    fontStyle: 'italic',
  },
};