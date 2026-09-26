import React, { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_REASONING = [
  "The failing test points at session validation, not the route handler, so I should look at verifySession before touching anything else.",
  "It compares the raw incoming token against the stored value directly — that works, but it means a timing side-channel and no expiry check.",
  "I'll hash the token before comparison and reject anything past its expiry, then rerun auth.spec.ts to confirm nothing else depended on the old behavior.",
];

const DEFAULT_FINAL_ANSWER =
  "Fixed it — verifySession now hashes the token before comparing it against stored sessions, and rejects anything past its expiry. Tests are passing.";

// Reveals `text` one character at a time into onChar, with punctuation-aware
// pacing so it doesn't read as a fixed-interval typewriter. Calls onDone once.
function useTypewriter() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stream = useCallback((text: string, onChar: (t: string) => void, onDone?: () => void) => {
    let i = 0;
    const tick = () => {
      if (i >= text.length) {
        onDone && onDone();
        return;
      }
      const ch = text[i];
      i++;
      onChar(text.slice(0, i));
      let delay = 10 + Math.random() * 16;
      if (ch === ' ') delay += 3;
      if (/[,;:]/.test(ch)) delay += 70;
      if (/[.!?]/.test(ch)) delay += 150;
      timeoutRef.current = setTimeout(tick, delay);
    };
    tick();
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);
  return stream;
}

export interface ReasoningTraceProps {
  reasoning?: string[];
  paragraphs?: string[];
  finalAnswer?: string;
  answer?: string;
  isDarkMode?: boolean;
}

export const ReasoningTraceTemplate: React.FC<ReasoningTraceProps> = ({
  reasoning,
  paragraphs: propsParagraphs,
  finalAnswer,
  answer: propsAnswer,
  isDarkMode = true,
}) => {
  const reasoningLines = reasoning || propsParagraphs || DEFAULT_REASONING;
  const targetAnswer = finalAnswer || propsAnswer || DEFAULT_FINAL_ANSWER;

  const [expanded, setExpanded] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[]>([]); // completed reasoning lines
  const [liveText, setLiveText] = useState(''); // currently streaming line
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [runId, setRunId] = useState(0);

  const stream = useTypewriter();

  // elapsed-seconds clock, only while thinking is live
  useEffect(() => {
    if (isDone) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isDone, runId]);

  // drive the sequence: reasoning paragraphs, then the final answer
  useEffect(() => {
    setExpanded(true);
    setIsDone(false);
    setElapsed(0);
    setParagraphs([]);
    setLiveText('');
    setAnswer('');
    setShowAnswer(false);

    let cancelled = false;

    function step(i: number) {
      if (cancelled) return;
      if (i >= reasoningLines.length) {
        setTimeout(() => {
          if (cancelled) return;
          setIsDone(true);
          setShowAnswer(true);
          stream(targetAnswer, setAnswer, () => {});
        }, 300);
        return;
      }
      stream(reasoningLines[i], setLiveText, () => {
        if (cancelled) return;
        setParagraphs((prev) => [...prev, reasoningLines[i]]);
        setLiveText('');
        step(i + 1);
      });
    }
    const kickoff = setTimeout(() => step(0), 400);

    return () => {
      cancelled = true;
      clearTimeout(kickoff);
    };
  }, [runId, stream, reasoningLines, targetAnswer]);

  const stillThinking = !isDone;

  return (
    <div
      style={{
        ...styles.body,
        background: isDarkMode ? '#0f0f10' : '#f8fafc',
      }}
    >
      <div style={styles.wrap}>
        <div
          style={styles.thead}
          onClick={() => setExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        >
          {stillThinking && (
            <span style={styles.dots}>
              <Dot delay={0} />
              <Dot delay={150} />
              <Dot delay={300} />
            </span>
          )}
          <span>{stillThinking ? 'Thinking' : `Thought for ${elapsed}s`}</span>
          <span
            style={{
              ...styles.chev,
              transform: expanded
                ? 'rotate(-135deg) translateY(1px)'
                : 'rotate(45deg) translateY(-1px)',
            }}
          />
        </div>

        <div
          style={{
            ...styles.panel,
            maxHeight: expanded ? 500 : 0,
          }}
        >
          <div
            style={{
              ...styles.reasoning,
              borderLeft: isDarkMode
                ? '2px solid rgba(255,255,255,.09)'
                : '2px solid rgba(0,0,0,.12)',
              color: isDarkMode ? '#87888b' : '#64748b',
            }}
          >
            {paragraphs.map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? '0 0 10px 0' : '10px 0' }}>
                {p}
              </p>
            ))}
            {stillThinking && liveText && (
              <p style={{ margin: paragraphs.length === 0 ? '0 0 10px 0' : '10px 0' }}>
                {liveText}
                <Caret color="#87888b" />
              </p>
            )}
          </div>
        </div>

        {showAnswer && (
          <div
            style={{
              ...styles.answer,
              borderTop: isDarkMode
                ? '1px solid rgba(255,255,255,.09)'
                : '1px solid rgba(0,0,0,.08)',
              color: isDarkMode ? '#d9d9da' : '#1e293b',
            }}
          >
            {answer}
            {answer.length < targetAnswer.length && <Caret color={isDarkMode ? '#d9d9da' : '#334155'} />}
          </div>
        )}

        <div style={styles.controls}>
          <button
            style={{
              ...styles.button,
              border: isDarkMode
                ? '1px solid rgba(255,255,255,.09)'
                : '1px solid rgba(0,0,0,.15)',
              color: isDarkMode ? '#87888b' : '#64748b',
            }}
            onClick={() => setRunId((n) => n + 1)}
          >
            ↻ Replay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReasoningTraceTemplate;

function Dot({ delay }: { delay: number }) {
  return (
    <i
      style={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: '#87888b',
        display: 'inline-block',
        animation: `reasoning-breathe 1s ease-in-out ${delay}ms infinite`,
      }}
    />
  );
}

function Caret({ color }: { color: string }) {
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

// Plain CSS for the two keyframe animations; inline styles can't declare
// @keyframes, so this is injected once alongside the component's markup.
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
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    background: '#0f0f10',
    width: '100%',
  },
  wrap: { width: '100%', maxWidth: 520 },
  thead: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
    userSelect: 'none',
    color: '#87888b',
    fontSize: 14,
  },
  dots: { display: 'inline-flex', gap: 3 },
  chev: {
    width: 7,
    height: 7,
    borderRight: '1.4px solid #87888b',
    borderBottom: '1.4px solid #87888b',
    transition: 'transform .3s cubic-bezier(.16,1,.3,1)',
    flexShrink: 0,
    marginLeft: 1,
  },
  panel: { overflow: 'hidden', transition: 'max-height .45s cubic-bezier(.16,1,.3,1)' },
  reasoning: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeft: '2px solid rgba(255,255,255,.09)',
    fontSize: 14,
    lineHeight: 1.7,
    color: '#87888b',
    fontStyle: 'italic',
  },
  answer: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,.09)',
    fontSize: 15,
    lineHeight: 1.65,
    color: '#d9d9da',
  },
  controls: { marginTop: 20 },
  button: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,.09)',
    color: '#87888b',
    fontSize: 12,
    padding: '6px 12px',
    borderRadius: 7,
    cursor: 'pointer',
  },
};
