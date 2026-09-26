import { Fragment } from "react";

// Splits a raw message into text and ```fenced``` code blocks, renders text
// through a light inline-markdown pass, and renders code/JSON with basic
// syntax coloring — no dependency on a markdown library.

const COLORS = {
  text: "#e8e8e8", dim: "#8a8a8a", string: "#7ee787", key: "#e8e8e8",
  number: "#79c0ff", bool: "#ff9d7e", punct: "#8a8a8a", code: "#c9d1d9",
};

export default function ChatMessage({ content }) {
  const parts = splitFences(content);
  return (
    <div style={{ fontFamily: "-apple-system,'Segoe UI',sans-serif", color: COLORS.text, fontSize: 14.5, lineHeight: 1.6 }}>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} lang={part.lang} code={part.code} />
        ) : (
          <p key={i} style={{ margin: "0 0 10px 0", whiteSpace: "pre-wrap" }}>
            {renderInline(part.text)}
          </p>
        )
      )}
    </div>
  );
}

// --- fence splitting: ```lang\n...\n``` -> { type: "code", lang, code } ---
function splitFences(raw) {
  const out = [];
  const fence = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = fence.exec(raw))) {
    if (m.index > last) out.push({ type: "text", text: raw.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "text", code: m[2].replace(/\n$/, "") });
    last = fence.lastIndex;
  }
  if (last < raw.length) out.push({ type: "text", text: raw.slice(last) });
  return out;
}

// --- inline markdown: **bold**, *italic*, `code`, [text](url) ---
function renderInline(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((t, i) => {
    if (/^\*\*[^*]+\*\*$/.test(t)) return <strong key={i}>{t.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(t)) return <em key={i}>{t.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(t))
      return (
        <code key={i} style={{ fontFamily: "ui-monospace,monospace", background: "rgba(255,255,255,.08)", padding: "1px 5px", borderRadius: 4 }}>
          {t.slice(1, -1)}
        </code>
      );
    const link = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} style={{ color: "#6fa8f0" }}>{link[1]}</a>;
    return <Fragment key={i}>{t}</Fragment>;
  });
}

function CodeBlock({ lang, code }) {
  return (
    <div style={{ margin: "0 0 14px 0" }}>
      <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 6 }}>{lang}</div>
      <pre
        style={{
          margin: 0, padding: "12px 14px", borderRadius: 9, overflowX: "auto",
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
          fontFamily: "ui-monospace,'SF Mono','Cascadia Code',Consolas,monospace", fontSize: 13, lineHeight: 1.55,
        }}
      >
        <code>{lang === "json" ? highlightJson(code) : highlightPlain(code)}</code>
      </pre>
    </div>
  );
}

// Minimal JSON tokenizer -> colored spans (keys, strings, numbers, booleans, punctuation)
function highlightJson(code) {
  const tokens = code.split(/("(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|-?\d+\.?\d*|\btrue\b|\bfalse\b|\bnull\b|[{}[\],:])/g);
  return tokens.map((tok, i) => {
    if (/^"(?:[^"\\]|\\.)*"(?=\s*:)?$/.test(tok) === false) {
      // fallthrough handled below by explicit checks
    }
    if (/^"(?:[^"\\]|\\.)*"$/.test(tok)) {
      const isKey = code.slice(code.indexOf(tok) + tok.length).trimStart().startsWith(":");
      return <span key={i} style={{ color: isKey ? COLORS.key : COLORS.string }}>{tok}</span>;
    }
    if (/^-?\d+\.?\d*$/.test(tok)) return <span key={i} style={{ color: COLORS.number }}>{tok}</span>;
    if (/^(true|false|null)$/.test(tok)) return <span key={i} style={{ color: COLORS.bool }}>{tok}</span>;
    if (/^[{}[\],:]$/.test(tok)) return <span key={i} style={{ color: COLORS.punct }}>{tok}</span>;
    return <Fragment key={i}>{tok}</Fragment>;
  });
}

function highlightPlain(code) {
  return <span style={{ color: COLORS.code }}>{code}</span>;
}
