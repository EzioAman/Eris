import { useState, useRef, useEffect } from "react";

// See elicitation-spec.md for the full contract. Renders one question,
// submits once via onAnswer, then goes read-only.
//
// question = {
//   id, prompt, mode: "single" | "multi",
//   options: [{ id, label }],
//   allowCustom?: boolean,
// }
// onAnswer receives { questionId, mode, values, isCustom }

export default function ElicitationQuestion({ question, onAnswer }) {
  const { id, prompt, mode, options, allowCustom } = question;

  const [answered, setAnswered] = useState(false);
  const [singlePick, setSinglePick] = useState(null);   // option id or null
  const [multiPicks, setMultiPicks] = useState(new Set());
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (customOpen) inputRef.current?.focus();
  }, [customOpen]);

  function submit(values, isCustom) {
    const cleaned = values.map((v) => (typeof v === "string" ? v.trim() : v)).filter(Boolean);
    if (cleaned.length === 0) return; // validation: nothing to submit
    setAnswered(true);
    onAnswer({ questionId: id, mode, values: cleaned, isCustom });
  }

  function pickSingle(optId) {
    setSinglePick(optId);
    setCustomOpen(false);
    submit([optId], false);
  }

  function openCustomSingle() {
    setSinglePick(null);
    setCustomOpen(true);
  }

  function submitCustomSingle() {
    if (!customText.trim()) return;
    submit([customText], true);
  }

  function toggleMulti(optId) {
    setMultiPicks((prev) => {
      const next = new Set(prev);
      next.has(optId) ? next.delete(optId) : next.add(optId);
      return next;
    });
  }

  function submitMulti() {
    const values = [...multiPicks];
    if (customOpen && customText.trim()) values.push(customText.trim());
    submit(values, customOpen && customText.trim().length > 0);
  }

  const isPickedSingle = (optId) => singlePick === optId;

  return (
    <div style={s.block}>
      <div style={s.prompt}>{prompt}</div>

      <div style={s.options}>
        {mode === "single" &&
          options.map((opt) => (
            <button
              key={opt.id}
              disabled={answered}
              onClick={() => pickSingle(opt.id)}
              style={{ ...s.opt, ...(isPickedSingle(opt.id) ? s.optPicked : {}) }}
            >
              {opt.label}
              <span style={s.tick(isPickedSingle(opt.id))}>✓</span>
            </button>
          ))}

        {mode === "multi" &&
          options.map((opt) => {
            const picked = multiPicks.has(opt.id);
            return (
              <button
                key={opt.id}
                disabled={answered}
                aria-pressed={picked}
                onClick={() => toggleMulti(opt.id)}
                style={{ ...s.optMulti, ...(picked ? s.optPicked : {}) }}
              >
                <span style={{ ...s.box, ...(picked ? s.boxPicked : {}) }}>{picked ? "✓" : ""}</span>
                {opt.label}
              </button>
            );
          })}

        {allowCustom && !answered && mode === "single" && !customOpen && (
          <button style={s.opt} onClick={openCustomSingle}>
            Type something else…
          </button>
        )}

        {allowCustom && !answered && mode === "multi" && !customOpen && (
          <button style={s.optMulti} onClick={() => setCustomOpen(true)}>
            <span style={s.box}></span>
            Type something else…
          </button>
        )}

        {customOpen && !answered && (
          <input
            ref={inputRef}
            style={s.input}
            placeholder="Type your answer…"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mode === "single") submitCustomSingle();
            }}
          />
        )}
      </div>

      {mode === "multi" && !answered && (
        <button
          style={s.submit}
          disabled={multiPicks.size === 0 && !customText.trim()}
          onClick={submitMulti}
        >
          Continue
        </button>
      )}
    </div>
  );
}

const s = {
  block: { fontFamily: "-apple-system,'Segoe UI',sans-serif", color: "#e8e8e8", maxWidth: 480 },
  prompt: { fontSize: 15, lineHeight: 1.6, marginBottom: 14 },
  options: { display: "flex", flexDirection: "column", gap: 8 },
  opt: {
    fontSize: 14, padding: "11px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.09)",
    background: "transparent", color: "#e8e8e8", cursor: "pointer", textAlign: "left",
    display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit",
  },
  optMulti: {
    fontSize: 14, padding: "11px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.09)",
    background: "transparent", color: "#e8e8e8", cursor: "pointer", textAlign: "left",
    display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit",
  },
  optPicked: { borderColor: "#6fa8f0", color: "#6fa8f0" },
  tick: (on) => ({ opacity: on ? 1 : 0, color: "#6fa8f0" }),
  box: {
    width: 15, height: 15, borderRadius: 4, border: "1.5px solid #8a8a8a",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0,
  },
  boxPicked: { borderColor: "#6fa8f0", color: "#6fa8f0" },
  input: {
    fontSize: 14, padding: "11px 14px", borderRadius: 9, border: "1px solid #6fa8f0",
    background: "transparent", color: "#e8e8e8", fontFamily: "inherit", outline: "none",
  },
  submit: {
    marginTop: 4, alignSelf: "flex-start", fontSize: 13, padding: "8px 16px", borderRadius: 8,
    border: "1px solid #6fa8f0", background: "transparent", color: "#6fa8f0", cursor: "pointer", fontFamily: "inherit",
  },
};
