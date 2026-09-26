import React, { Fragment } from 'react';

// Splits a raw message into text and ```fenced``` code blocks, renders text
// through a light inline-markdown pass, and renders code/JSON with basic
// syntax coloring — no dependency on a markdown library.

const DARK_COLORS = {
  text: '#e8e8e8',
  dim: '#8a8a8a',
  string: '#7ee787',
  key: '#e8e8e8',
  number: '#79c0ff',
  bool: '#ff9d7e',
  punct: '#8a8a8a',
  code: '#c9d1d9',
};

const LIGHT_COLORS = {
  text: '#1e293b',
  dim: '#64748b',
  string: '#059669',
  key: '#1e293b',
  number: '#0284c7',
  bool: '#ea580c',
  punct: '#64748b',
  code: '#334155',
};

export interface ChatMessageFormatterProps {
  content: string;
  isDarkMode?: boolean;
}

export const ChatMessageFormatter: React.FC<ChatMessageFormatterProps> = ({
  content,
  isDarkMode = true,
}) => {
  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // Clean out any raw XML tool tags before rendering
  const sanitized = content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .trim();

  if (!sanitized) return null;

  const parts = splitFences(sanitized);

  return (
    <div
      style={{
        fontFamily: "-apple-system, 'Segoe UI', sans-serif",
        color: colors.text,
        fontSize: 14.5,
        lineHeight: 1.6,
      }}
    >
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <CodeBlock key={i} lang={part.lang} code={part.code} isDarkMode={isDarkMode} colors={colors} />
        ) : (
          <p key={i} style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>
            {renderInline(part.text, isDarkMode)}
          </p>
        )
      )}
    </div>
  );
};

export default ChatMessageFormatter;

// --- fence splitting: ```lang\n...\n``` -> { type: "code", lang, code } ---
function splitFences(raw: string): Array<{ type: 'text' | 'code'; lang?: string; text?: string; code?: string }> {
  const out: Array<{ type: 'text' | 'code'; lang?: string; text?: string; code?: string }> = [];
  const fence = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = fence.exec(raw)) !== null) {
    if (m.index > last) {
      out.push({ type: 'text', text: raw.slice(last, m.index) });
    }
    out.push({ type: 'code', lang: m[1] || 'text', code: m[2].replace(/\n$/, '') });
    last = fence.lastIndex;
  }
  if (last < raw.length) {
    out.push({ type: 'text', text: raw.slice(last) });
  }
  return out;
}

// --- inline markdown: **bold**, *italic*, `code`, [text](url) ---
function renderInline(text: string = '', isDarkMode: boolean) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((t, i) => {
    if (/^\*\*[^*]+\*\*$/.test(t)) {
      return <strong key={i}>{t.slice(2, -2)}</strong>;
    }
    if (/^\*[^*]+\*$/.test(t)) {
      return <em key={i}>{t.slice(1, -1)}</em>;
    }
    if (/^`[^`]+`$/.test(t)) {
      return (
        <code
          key={i}
          style={{
            fontFamily: 'ui-monospace, monospace',
            background: isDarkMode ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.92em',
          }}
        >
          {t.slice(1, -1)}
        </code>
      );
    }
    const link = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6fa8f0', textDecoration: 'underline' }}
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{t}</Fragment>;
  });
}

function CodeBlock({
  lang = '',
  code = '',
  isDarkMode,
  colors,
}: {
  lang?: string;
  code?: string;
  isDarkMode: boolean;
  colors: typeof DARK_COLORS;
}) {
  return (
    <div style={{ margin: '0 0 14px 0' }}>
      <div style={{ fontSize: 12, color: colors.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {lang}
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px 14px',
          borderRadius: 9,
          overflowX: 'auto',
          background: isDarkMode ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.03)',
          border: isDarkMode ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(0,0,0,.08)',
          fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        <code>{lang === 'json' ? highlightJson(code, colors) : highlightPlain(code, colors)}</code>
      </pre>
    </div>
  );
}

// Minimal JSON tokenizer -> colored spans (keys, strings, numbers, booleans, punctuation)
function highlightJson(code: string, colors: typeof DARK_COLORS) {
  const tokens = code.split(/("(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|-?\d+\.?\d*|\btrue\b|\bfalse\b|\bnull\b|[{}[\],:])/g);
  return tokens.map((tok, i) => {
    if (/^"(?:[^"\\]|\\.)*"$/.test(tok)) {
      const isKey = code.slice(code.indexOf(tok) + tok.length).trimStart().startsWith(':');
      return <span key={i} style={{ color: isKey ? colors.key : colors.string }}>{tok}</span>;
    }
    if (/^-?\d+\.?\d*$/.test(tok)) return <span key={i} style={{ color: colors.number }}>{tok}</span>;
    if (/^(true|false|null)$/.test(tok)) return <span key={i} style={{ color: colors.bool }}>{tok}</span>;
    if (/^[{}[\],:]$/.test(tok)) return <span key={i} style={{ color: colors.punct }}>{tok}</span>;
    return <Fragment key={i}>{tok}</Fragment>;
  });
}

function highlightPlain(code: string, colors: typeof DARK_COLORS) {
  return <span style={{ color: colors.code }}>{code}</span>;
}
