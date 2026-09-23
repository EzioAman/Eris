import React, { useState, useMemo } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MarkdownContentProps {
  content: string;
  isDarkMode?: boolean;
  className?: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
  isDarkMode: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, isDarkMode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'my-3 rounded-xl overflow-hidden border font-mono text-[13px] shadow-sm',
        isDarkMode ? 'border-white/10 bg-[#0A0D14]' : 'border-slate-200 bg-slate-900 text-white'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-3 py-1.5 border-b select-none text-xs',
          isDarkMode
            ? 'border-white/5 bg-white/[0.03] text-neutral-400'
            : 'border-white/10 bg-black/30 text-slate-300'
        )}
      >
        <span className="font-sans font-medium uppercase tracking-wider text-[11px]">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 transition-colors text-[11px] cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  isDarkMode = false,
  className,
}) => {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let listItems: string[] = [];
    let isOrderedList = false;

    const flushList = (key: string) => {
      if (listItems.length === 0) return;
      const ListTag = isOrderedList ? 'ol' : 'ul';
      elements.push(
        <ListTag
          key={key}
          className={cn(
            'my-2 pl-6 space-y-1 text-[14px] leading-relaxed',
            isOrderedList ? 'list-decimal' : 'list-disc',
            isDarkMode ? 'text-neutral-200 marker:text-neutral-500' : 'text-slate-700 marker:text-slate-400'
          )}
        >
          {listItems.map((item, idx) => (
            <li key={idx}>
              <InlineText text={item} isDarkMode={isDarkMode} />
            </li>
          ))}
        </ListTag>
      );
      listItems = [];
    };

    lines.forEach((line, index) => {
      // Code Block Boundary
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <CodeBlock
              key={`code-${index}`}
              language={codeLanguage}
              code={codeLines.join('\n')}
              isDarkMode={isDarkMode}
            />
          );
          codeLines = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          flushList(`list-before-code-${index}`);
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // Headings
      if (line.startsWith('### ')) {
        flushList(`list-${index}`);
        elements.push(
          <h3
            key={`h3-${index}`}
            className={cn(
              'text-[16px] font-semibold mt-4 mb-2 tracking-tight flex items-center gap-2',
              isDarkMode ? 'text-white' : 'text-slate-900'
            )}
          >
            <InlineText text={line.slice(4)} isDarkMode={isDarkMode} />
          </h3>
        );
        return;
      }

      if (line.startsWith('## ')) {
        flushList(`list-${index}`);
        elements.push(
          <h2
            key={`h2-${index}`}
            className={cn(
              'text-[18px] font-bold mt-5 mb-2.5 tracking-tight border-b pb-1',
              isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
            )}
          >
            <InlineText text={line.slice(3)} isDarkMode={isDarkMode} />
          </h2>
        );
        return;
      }

      if (line.startsWith('# ')) {
        flushList(`list-${index}`);
        elements.push(
          <h1
            key={`h1-${index}`}
            className={cn(
              'text-[20px] font-bold mt-6 mb-3 tracking-tight border-b pb-1.5',
              isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
            )}
          >
            <InlineText text={line.slice(2)} isDarkMode={isDarkMode} />
          </h1>
        );
        return;
      }

      // Unordered List
      if (/^\s*[-*•]\s+/.test(line)) {
        const itemText = line.replace(/^\s*[-*•]\s+/, '');
        if (isOrderedList && listItems.length > 0) flushList(`ordered-${index}`);
        isOrderedList = false;
        listItems.push(itemText);
        return;
      }

      // Ordered List
      if (/^\s*\d+\.\s+/.test(line)) {
        const itemText = line.replace(/^\s*\d+\.\s+/, '');
        if (!isOrderedList && listItems.length > 0) flushList(`unordered-${index}`);
        isOrderedList = true;
        listItems.push(itemText);
        return;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        flushList(`list-${index}`);
        elements.push(
          <blockquote
            key={`quote-${index}`}
            className={cn(
              'my-2.5 pl-3.5 border-l-2 py-1 italic text-[14px] leading-relaxed',
              isDarkMode ? 'border-indigo-500/60 text-neutral-300 bg-white/[0.02]' : 'border-indigo-500 text-slate-600 bg-slate-50'
            )}
          >
            <InlineText text={line.slice(2)} isDarkMode={isDarkMode} />
          </blockquote>
        );
        return;
      }

      // Regular Paragraph or Empty Line
      flushList(`list-${index}`);
      if (line.trim().length > 0) {
        elements.push(
          <p
            key={`p-${index}`}
            className={cn(
              'my-1.5 text-[14px] leading-relaxed',
              isDarkMode ? 'text-neutral-200' : 'text-slate-700'
            )}
          >
            <InlineText text={line} isDarkMode={isDarkMode} />
          </p>
        );
      }
    });

    flushList('final-list');

    if (inCodeBlock && codeLines.length > 0) {
      elements.push(
        <CodeBlock
          key="final-code"
          language={codeLanguage}
          code={codeLines.join('\n')}
          isDarkMode={isDarkMode}
        />
      );
    }

    return elements;
  }, [content, isDarkMode]);

  return <div className={cn('markdown-body space-y-0.5', className)}>{renderedElements}</div>;
};

// Inline Text Formatter (handles bold, italics, code pills, markdown links, and bare URLs)
const InlineText: React.FC<{ text: string; isDarkMode: boolean }> = ({ text, isDarkMode }) => {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<>"]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className={cn(
            'px-1.5 py-0.5 mx-0.5 rounded text-[12.5px] font-mono select-text font-medium',
            isDarkMode
              ? 'bg-white/10 text-indigo-300 border border-white/10'
              : 'bg-slate-100 text-indigo-700 border border-slate-200'
          )}
        >
          {code}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong
          key={match.index}
          className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        parts.push(
          <a
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-0.5 underline underline-offset-2 transition-colors font-medium',
              isDarkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-800'
            )}
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline-block ml-0.5" />
          </a>
        );
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-0.5 underline underline-offset-2 transition-colors font-medium break-all',
            isDarkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-800'
          )}
        >
          <span>{token}</span>
          <ExternalLink className="w-3 h-3 inline-block ml-0.5 shrink-0" />
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
};
