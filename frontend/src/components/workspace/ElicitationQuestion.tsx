import React, { useState, useRef, useEffect } from 'react';

// See elicitation-spec.md for the full contract. Renders one question,
// submits once via onAnswer, then goes read-only.
//
// question = {
//   id, prompt, mode: "single" | "multi",
//   options: [{ id, label }],
//   allowCustom?: boolean,
// }
// onAnswer receives { questionId, mode, values, isCustom }

export interface ElicitationOption {
  id: string;
  label: string;
}

export interface ElicitationQuestionData {
  id: string;
  prompt: string;
  mode: 'single' | 'multi';
  options: ElicitationOption[];
  allowCustom?: boolean;
}

export interface ElicitationAnswer {
  questionId: string;
  mode: 'single' | 'multi';
  values: string[];
  isCustom: boolean;
}

export interface ElicitationQuestionProps {
  question: ElicitationQuestionData;
  onAnswer: (answer: ElicitationAnswer) => void;
  isDarkMode?: boolean;
  initialAnswer?: ElicitationAnswer;
}

export const ElicitationQuestion: React.FC<ElicitationQuestionProps> = ({
  question,
  onAnswer,
  isDarkMode = true,
  initialAnswer,
}) => {
  const { id, prompt, mode, options, allowCustom } = question;

  const [answered, setAnswered] = useState<boolean>(Boolean(initialAnswer));
  const [singlePick, setSinglePick] = useState<string | null>(
    initialAnswer && initialAnswer.mode === 'single' ? initialAnswer.values[0] || null : null
  );
  const [multiPicks, setMultiPicks] = useState<Set<string>>(
    new Set(initialAnswer && initialAnswer.mode === 'multi' ? initialAnswer.values : [])
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState(
    initialAnswer?.isCustom ? initialAnswer.values[initialAnswer.values.length - 1] || '' : ''
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customOpen) inputRef.current?.focus();
  }, [customOpen]);

  function submit(values: string[], isCustom: boolean) {
    const cleaned = values.map((v) => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
    if (cleaned.length === 0) return; // validation: nothing to submit
    setAnswered(true);
    onAnswer({ questionId: id, mode, values: cleaned, isCustom });
  }

  function pickSingle(optId: string) {
    if (answered) return;
    setSinglePick(optId);
    setCustomOpen(false);
    submit([optId], false);
  }

  function openCustomSingle() {
    if (answered) return;
    setSinglePick(null);
    setCustomOpen(true);
  }

  function submitCustomSingle() {
    if (answered || !customText.trim()) return;
    submit([customText.trim()], true);
  }

  function toggleMulti(optId: string) {
    if (answered) return;
    setMultiPicks((prev) => {
      const next = new Set(prev);
      if (next.has(optId)) {
        next.delete(optId);
      } else {
        next.add(optId);
      }
      return next;
    });
  }

  function submitMulti() {
    if (answered) return;
    const values = [...multiPicks];
    if (customOpen && customText.trim()) {
      values.push(customText.trim());
    }
    submit(values, customOpen && customText.trim().length > 0);
  }

  const isPickedSingle = (optId: string) => singlePick === optId;

  const textColor = isDarkMode ? '#e8e8e8' : '#1e293b';
  const borderColor = isDarkMode ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.12)';
  const brandColor = '#6fa8f0';

  return (
    <div style={{ ...s.block, color: textColor }}>
      <div style={s.prompt}>{prompt}</div>

      <div style={s.options}>
        {mode === 'single' &&
          options.map((opt) => {
            const picked = isPickedSingle(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={answered}
                onClick={() => pickSingle(opt.id)}
                style={{
                  ...s.opt,
                  borderColor: picked ? brandColor : borderColor,
                  color: picked ? brandColor : textColor,
                  cursor: answered ? 'default' : 'pointer',
                  opacity: answered && !picked ? 0.45 : 1,
                }}
              >
                <span>{opt.label}</span>
                <span
                  style={{
                    opacity: picked ? 1 : 0,
                    color: brandColor,
                    fontWeight: 'bold',
                  }}
                >
                  ✓
                </span>
              </button>
            );
          })}

        {mode === 'multi' &&
          options.map((opt) => {
            const picked = multiPicks.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={answered}
                aria-pressed={picked}
                onClick={() => toggleMulti(opt.id)}
                style={{
                  ...s.optMulti,
                  borderColor: picked ? brandColor : borderColor,
                  color: picked ? brandColor : textColor,
                  cursor: answered ? 'default' : 'pointer',
                  opacity: answered && !picked ? 0.45 : 1,
                }}
              >
                <span
                  style={{
                    ...s.box,
                    borderColor: picked ? brandColor : isDarkMode ? '#8a8a8a' : '#94a3b8',
                    color: brandColor,
                  }}
                >
                  {picked ? '✓' : ''}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}

        {allowCustom && !answered && mode === 'single' && !customOpen && (
          <button
            type="button"
            style={{ ...s.opt, borderColor, color: textColor }}
            onClick={openCustomSingle}
          >
            Type something else…
          </button>
        )}

        {allowCustom && !answered && mode === 'multi' && !customOpen && (
          <button
            type="button"
            style={{ ...s.optMulti, borderColor, color: textColor }}
            onClick={() => setCustomOpen(true)}
          >
            <span style={{ ...s.box, borderColor: isDarkMode ? '#8a8a8a' : '#94a3b8' }} />
            Type something else…
          </button>
        )}

        {customOpen && !answered && (
          <input
            ref={inputRef}
            style={{
              ...s.input,
              borderColor: brandColor,
              color: textColor,
            }}
            placeholder="Type your answer…"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && mode === 'single') submitCustomSingle();
            }}
          />
        )}
      </div>

      {mode === 'multi' && !answered && (
        <button
          type="button"
          style={{
            ...s.submit,
            borderColor: brandColor,
            color: brandColor,
            opacity: multiPicks.size === 0 && !customText.trim() ? 0.4 : 1,
            cursor: multiPicks.size === 0 && !customText.trim() ? 'not-allowed' : 'pointer',
          }}
          disabled={multiPicks.size === 0 && !customText.trim()}
          onClick={submitMulti}
        >
          Continue
        </button>
      )}
    </div>
  );
};

export default ElicitationQuestion;

const s: Record<string, React.CSSProperties> = {
  block: {
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    maxWidth: 480,
    width: '100%',
    margin: '10px 0',
  },
  prompt: {
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 14,
    fontWeight: 500,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  opt: {
    fontSize: 14,
    padding: '11px 14px',
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: 'solid',
    background: 'transparent',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  optMulti: {
    fontSize: 14,
    padding: '11px 14px',
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: 'solid',
    background: 'transparent',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  box: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.5,
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    flexShrink: 0,
    fontWeight: 'bold',
  },
  input: {
    fontSize: 14,
    padding: '11px 14px',
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: 'solid',
    background: 'transparent',
    fontFamily: 'inherit',
    outline: 'none',
  },
  submit: {
    marginTop: 10,
    alignSelf: 'flex-start',
    fontSize: 13,
    padding: '8px 16px',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    background: 'transparent',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
};
