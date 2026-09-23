import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface CodeSnippetTemplateProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  isDarkMode?: boolean;
  className?: string;
}

export const CodeSnippetTemplate: React.FC<CodeSnippetTemplateProps> = ({
  code,
  language = 'python',
  showLineNumbers = true,
  isDarkMode = true,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div
      className={cn(
        'w-full rounded-xl border font-mono text-xs overflow-hidden shadow-xs transition-colors',
        isDarkMode ? 'border-neutral-800 bg-[#0B0D14]' : 'border-slate-200 bg-slate-900 text-slate-100',
        className
      )}
    >
      {/* Header with language & copy button */}
      <div
        className={cn(
          'flex items-center justify-between px-3.5 py-2 border-b select-none',
          isDarkMode ? 'border-neutral-800/80 bg-white/[0.02]' : 'border-slate-800 bg-slate-950/40'
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors text-slate-300 hover:text-white hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="p-3.5 overflow-x-auto">
        <table className="border-collapse w-full">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="leading-relaxed">
                {showLineNumbers && (
                  <td className="pr-4 text-right select-none text-slate-500 w-8">
                    {idx + 1}
                  </td>
                )}
                <td className="text-slate-200 whitespace-pre">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CodeSnippetTemplate;
