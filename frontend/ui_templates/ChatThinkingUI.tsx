import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Globe,
  Circle,
  ExternalLink,
  Terminal as TerminalIcon,
  Code2,
  Smartphone,
  Apple,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '../src/lib/utils';
import { TerminalWindowTemplate } from './TerminalWindowTemplate';
import { CodeComparisonTemplate } from './CodeComparisonTemplate';
import { AndroidDeviceTemplate } from './AndroidDeviceTemplate';
import { IosDeviceTemplate } from './IosDeviceTemplate';
import { SafariBrowserTemplate } from './SafariBrowserTemplate';

export interface SearchStep {
  query: string;
  status?: 'searching' | 'done';
  results?: { title: string; domain: string; url?: string }[];
}

export interface TerminalStep {
  command: string;
  status?: 'running' | 'done' | 'failed';
  output?: string;
}

export interface ComparisonStep {
  fileName: string;
  language?: string;
  before: string;
  after: string;
}

export interface DeviceStep {
  platform: 'android' | 'ios';
  src?: string;
  title?: string;
}

export interface BrowserStep {
  url: string;
  title?: string;
  readerContent?: string;
}

export interface ChatThinkingUIProps {
  isActive?: boolean;
  elapsedSeconds?: number;
  reasoning?: string;
  searches?: SearchStep[];
  terminalSteps?: TerminalStep[];
  comparisons?: ComparisonStep[];
  deviceSteps?: DeviceStep[];
  browserSteps?: BrowserStep[];
  fullText?: string;
  sources?: { domain: string; url: string; title?: string }[];
  isDarkMode?: boolean;
  onCite?: (index: number) => void;
  onSendMessage?: (msg: string) => void;
  defaultExpanded?: boolean;
}

export function BlinkingCursor() {
  return (
    <span className="inline-block w-1.5 h-3.5 bg-neutral-400 dark:bg-neutral-300 ml-0.5 align-middle animate-pulse" />
  );
}

// ─── The single collapsed/expandable activity row ─────────────────────────
export const ActivityLog: React.FC<{
  isActive?: boolean;
  elapsedSeconds?: number;
  reasoning?: string;
  searches?: SearchStep[];
  terminalSteps?: TerminalStep[];
  comparisons?: ComparisonStep[];
  deviceSteps?: DeviceStep[];
  browserSteps?: BrowserStep[];
  isDarkMode?: boolean;
  onSendMessage?: (msg: string) => void;
  defaultExpanded?: boolean;
}> = ({
  isActive = false,
  elapsedSeconds = 0,
  reasoning,
  searches = [],
  terminalSteps = [],
  comparisons = [],
  deviceSteps = [],
  browserSteps = [],
  isDarkMode = true,
  onSendMessage,
  defaultExpanded = false,
}) => {
  const [open, setOpen] = useState(defaultExpanded);
  const [expandedTerminalIdx, setExpandedTerminalIdx] = useState<number | null>(null);
  const [expandedComparisonIdx, setExpandedComparisonIdx] = useState<number | null>(null);

  const doneSearches = searches.filter((s) => s.status === 'done');
  const doneTerminals = terminalSteps.filter((t) => t.status === 'done' || !t.status);

  // Auto-expand during live generation if reasoning or steps appear
  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  let summary = 'Thinking…';
  if (!isActive) {
    const parts: string[] = [`Thought for ${Math.max(1, elapsedSeconds)}s`];
    if (doneSearches.length > 0) {
      parts.push(`searched ${doneSearches.length} source${doneSearches.length > 1 ? 's' : ''}`);
    }
    if (doneTerminals.length > 0) {
      parts.push(`ran ${doneTerminals.length} command${doneTerminals.length > 1 ? 's' : ''}`);
    }
    if (comparisons.length > 0) {
      parts.push(`reviewed diff`);
    }
    if (deviceSteps.length > 0) {
      parts.push(`previewed device`);
    }
    summary = parts.join(' · ');
  }

  return (
    <div className="text-sm font-sans my-1 select-text">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-1.5 py-1 text-xs transition-colors cursor-pointer text-left',
          isDarkMode
            ? 'text-neutral-400 hover:text-neutral-200'
            : 'text-neutral-600 hover:text-neutral-900'
        )}
      >
        <ChevronRight
          size={14}
          className={cn(
            'shrink-0 transition-transform duration-200',
            open ? 'rotate-90' : '',
            isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
          )}
        />
        <Circle
          size={6}
          className={cn(
            'shrink-0 transition-colors',
            isActive
              ? 'fill-amber-400 text-amber-400 animate-pulse'
              : 'fill-neutral-400/60 text-neutral-400/60'
          )}
        />
        <span className="truncate font-medium">{summary}</span>
      </button>

      {/* Collapses to 0 height — never reserves space when closed */}
      <div
        className="grid transition-all duration-200 ease-out overflow-hidden"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'ml-[19px] pl-3 border-l py-1.5 space-y-2.5 transition-colors',
              isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
            )}
          >
            {/* Reasoning text */}
            {reasoning && (
              <p
                className={cn(
                  'text-xs leading-relaxed whitespace-pre-wrap font-sans',
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                )}
              >
                {reasoning}
                {isActive && <BlinkingCursor />}
              </p>
            )}

            {/* Web Search Steps */}
            {searches.map((s, i) => (
              <div key={`search-${i}`} className="text-xs space-y-1">
                <div
                  className={cn(
                    'flex items-center gap-1.5 font-mono',
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
                  )}
                >
                  <Globe
                    size={12}
                    className={cn(
                      'shrink-0',
                      s.status === 'searching'
                        ? 'text-cyan-400 animate-spin'
                        : isDarkMode
                        ? 'text-cyan-400'
                        : 'text-blue-600'
                    )}
                  />
                  <span>
                    {s.status === 'searching' ? `Searching "${s.query}"…` : `"${s.query}"`}
                  </span>
                </div>
                {s.results && s.results.length > 0 && (
                  <ul className="mt-1 space-y-1 pl-4">
                    {s.results.map((r, j) => (
                      <li
                        key={j}
                        className={cn(
                          'truncate text-[11px]',
                          isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                        )}
                      >
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline text-cyan-500 dark:text-cyan-400 inline-flex items-center gap-1"
                          >
                            {r.title}
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <span>{r.title}</span>
                        )}
                        <span className="opacity-60 ml-1.5">— {r.domain}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Terminal / Command Execution Steps */}
            {terminalSteps.map((t, i) => (
              <div key={`term-${i}`} className="text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 font-mono truncate',
                      isDarkMode ? 'text-neutral-300' : 'text-neutral-800'
                    )}
                  >
                    <TerminalIcon size={12} className="text-emerald-400 shrink-0" />
                    <span className="truncate">$ {t.command}</span>
                  </div>
                  {t.output && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTerminalIdx(expandedTerminalIdx === i ? null : i)
                      }
                      className="text-[11px] text-cyan-500 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {expandedTerminalIdx === i ? (
                        <>
                          <Minimize2 size={10} /> Hide Output
                        </>
                      ) : (
                        <>
                          <Maximize2 size={10} /> View Terminal
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Inline or Full Terminal Window Template */}
                {expandedTerminalIdx === i && (
                  <div className="mt-2 w-full max-w-2xl">
                    <TerminalWindowTemplate
                      title={`Command: ${t.command}`}
                      initialLines={[
                        { id: '1', text: `$ ${t.command}`, isCommand: true, status: 'success' },
                        { id: '2', text: t.output || 'Done.', isCommand: false, status: 'success' },
                      ]}
                      allowInput={false}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Code Comparison Steps */}
            {comparisons.map((c, i) => (
              <div key={`comp-${i}`} className="text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 font-mono text-xs',
                      isDarkMode ? 'text-neutral-300' : 'text-neutral-800'
                    )}
                  >
                    <Code2 size={12} className="text-indigo-400 shrink-0" />
                    <span>Diff: {c.fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComparisonIdx(expandedComparisonIdx === i ? null : i)
                    }
                    className="text-[11px] text-indigo-400 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    {expandedComparisonIdx === i ? 'Collapse Diff' : 'Expand Diff View'}
                  </button>
                </div>

                {expandedComparisonIdx === i && (
                  <div className="mt-2 w-full max-w-3xl">
                    <CodeComparisonTemplate
                      beforeCode={c.before}
                      afterCode={c.after}
                      fileName={c.fileName}
                      language={c.language || 'typescript'}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Device Previews (Android & iOS) */}
            {deviceSteps.map((d, i) => (
              <div key={`device-${i}`} className="space-y-2 py-1">
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium',
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-800'
                  )}
                >
                  {d.platform === 'ios' ? (
                    <Apple size={13} className="text-neutral-400" />
                  ) : (
                    <Smartphone size={13} className="text-emerald-500" />
                  )}
                  <span>{d.title || `${d.platform.toUpperCase()} Simulator Preview`}</span>
                </div>

                <div className="flex justify-center py-2">
                  {d.platform === 'ios' ? (
                    <IosDeviceTemplate imageSrc={d.src} />
                  ) : (
                    <AndroidDeviceTemplate imageSrc={d.src} />
                  )}
                </div>
              </div>
            ))}

            {/* Browser Steps */}
            {browserSteps.map((b, i) => (
              <div key={`browser-${i}`} className="space-y-2 py-1">
                <div className="w-full max-w-3xl">
                  <SafariBrowserTemplate
                    url={b.url}
                    title={b.title}
                    readerContent={b.readerContent}
                    onAskEris={onSendMessage}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Streamed answer with inline citation markers ─────────────────────────
export const StreamingAnswer: React.FC<{
  fullText: string;
  active?: boolean;
  onCite?: (index: number) => void;
  isDarkMode?: boolean;
}> = ({ fullText, active = false, onCite, isDarkMode = true }) => {
  const [shown, setShown] = useState(active ? '' : fullText);

  useEffect(() => {
    if (!active) {
      setShown(fullText);
      return;
    }
    const words = fullText.split(' ');
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(words.slice(0, i).join(' '));
      if (i >= words.length) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [fullText, active]);

  const parts = shown.split(/(\[\d+\])/g);
  return (
    <div
      className={cn(
        'text-[14px] leading-relaxed whitespace-pre-wrap font-sans',
        isDarkMode ? 'text-neutral-100' : 'text-neutral-900'
      )}
    >
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (m) {
          return (
            <sup
              key={i}
              onClick={() => onCite?.(Number(m[1]))}
              className="cursor-pointer text-cyan-500 dark:text-cyan-400 font-semibold mx-0.5 hover:underline text-xs"
            >
              [{m[1]}]
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

// ─── Sources Strip ────────────────────────────────────────────────────────
export const SourcesStrip: React.FC<{
  sources: { domain: string; url: string; title?: string }[];
  highlighted?: number | null;
  isDarkMode?: boolean;
}> = ({ sources, highlighted, isDarkMode = true }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {sources.map((s, i) => {
        const isSelected = highlighted === i + 1;
        return (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all',
              isSelected
                ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-xs'
                : isDarkMode
                ? 'border-neutral-800 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            title={s.title || s.url}
          >
            <span className="tabular-nums font-mono text-[11px] opacity-60">{i + 1}</span>
            <span className="font-medium">{s.domain}</span>
            <ExternalLink size={10} className="opacity-70" />
          </a>
        );
      })}
    </div>
  );
};

// ─── Default Master Component ─────────────────────────────────────────────
export const ChatThinkingUI: React.FC<ChatThinkingUIProps> = ({
  isActive = false,
  elapsedSeconds = 0,
  reasoning,
  searches = [],
  terminalSteps = [],
  comparisons = [],
  deviceSteps = [],
  browserSteps = [],
  fullText = '',
  sources = [],
  isDarkMode = true,
  onCite,
  onSendMessage,
  defaultExpanded = false,
}) => {
  const [citedIndex, setCitedIndex] = useState<number | null>(null);

  const handleCite = (idx: number) => {
    setCitedIndex(idx);
    onCite?.(idx);
  };

  return (
    <div className="w-full space-y-2 select-text font-sans">
      <ActivityLog
        isActive={isActive}
        elapsedSeconds={elapsedSeconds}
        reasoning={reasoning}
        searches={searches}
        terminalSteps={terminalSteps}
        comparisons={comparisons}
        deviceSteps={deviceSteps}
        browserSteps={browserSteps}
        isDarkMode={isDarkMode}
        onSendMessage={onSendMessage}
        defaultExpanded={defaultExpanded}
      />

      {fullText && (
        <div className="pt-1 space-y-2">
          <StreamingAnswer
            fullText={fullText}
            active={isActive}
            onCite={handleCite}
            isDarkMode={isDarkMode}
          />
          <SourcesStrip
            sources={sources}
            highlighted={citedIndex}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  );
};

export default ChatThinkingUI;
