import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../src/lib/utils';
import { Check, Copy, Split, Columns2, FileCode, SlidersHorizontal } from 'lucide-react';

export interface CodeComparisonTemplateProps {
  beforeCode: string;
  afterCode: string;
  language?: string;
  fileName?: string;
  className?: string;
  initialSliderPosition?: number;
}

export const CodeComparisonTemplate: React.FC<CodeComparisonTemplateProps> = ({
  beforeCode,
  afterCode,
  language = 'typescript',
  fileName = 'auth_service.ts',
  className,
  initialSliderPosition = 50,
}) => {
  const [copiedBefore, setCopiedBefore] = useState(false);
  const [copiedAfter, setCopiedAfter] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [sliderPos, setSliderPos] = useState<number>(initialSliderPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string, isBefore: boolean) => {
    navigator.clipboard.writeText(text);
    if (isBefore) {
      setCopiedBefore(true);
      setTimeout(() => setCopiedBefore(false), 2000);
    } else {
      setCopiedAfter(true);
      setTimeout(() => setCopiedAfter(false), 2000);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
  }, [isDragging]);

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
  };

  const beforeLines = (beforeCode || '// No prior code').split('\n');
  const afterLines = (afterCode || '// No updated code').split('\n');

  return (
    <div
      className={cn(
        'w-full rounded-2xl border overflow-hidden shadow-xl font-sans transition-colors',
        'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)]',
        className
      )}
    >
      {/* Magic UI Code Comparison Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-workspace)] bg-black/5 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <FileCode className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-semibold truncate">{fileName}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border-workspace)] bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-workspace)] bg-black/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              title="Interactive Slider Mode"
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer',
                viewMode === 'slider'
                  ? 'bg-white dark:bg-white/15 text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              title="Side-by-Side Dual View"
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer',
                viewMode === 'side-by-side'
                  ? 'bg-white dark:bg-white/15 text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Columns2 className="w-3 h-3" />
              <span>Dual</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(afterCode, false)}
            title="Copy modified output"
            className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-workspace)] text-[11px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            {copiedAfter ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAfter ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Display Area */}
      {viewMode === 'slider' ? (
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          className="relative w-full overflow-hidden select-none bg-[var(--bg-workspace)]"
          style={{ minHeight: '260px' }}
        >
          {/* Base Layer: After (Modified Code) */}
          <div className="w-full h-full p-4 font-mono text-xs overflow-x-auto leading-relaxed">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-workspace)] text-[11px] font-semibold text-emerald-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>After (Proposed Changes)</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">{afterLines.length} lines</span>
            </div>
            <div className="space-y-0.5">
              {afterLines.map((line, idx) => (
                <div key={`after-${idx}`} className="flex items-start gap-3 rounded px-1.5 py-0.5 bg-emerald-500/5 hover:bg-emerald-500/10">
                  <span className="w-8 text-right text-[var(--text-secondary)] opacity-50 select-none shrink-0 font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="text-emerald-500 select-none shrink-0 font-semibold">+</span>
                  <span className="text-[var(--text-primary)] font-mono whitespace-pre break-all">{line || ' '}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clip Overlay Layer: Before (Original Code) */}
          <div
            className="absolute inset-0 overflow-hidden font-mono text-xs pointer-events-none border-r-2 border-indigo-500 bg-[var(--bg-workspace)] shadow-2xl"
            style={{ width: `${sliderPos}%` }}
          >
            <div className="w-full h-full p-4 overflow-x-auto leading-relaxed" style={{ width: containerRef.current?.offsetWidth || '100%' }}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-workspace)] text-[11px] font-semibold text-rose-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500" />
                  <span>Before (Original State)</span>
                </span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">{beforeLines.length} lines</span>
              </div>
              <div className="space-y-0.5">
                {beforeLines.map((line, idx) => (
                  <div key={`before-${idx}`} className="flex items-start gap-3 rounded px-1.5 py-0.5 bg-rose-500/5 hover:bg-rose-500/10">
                    <span className="w-8 text-right text-[var(--text-secondary)] opacity-50 select-none shrink-0 font-mono text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="text-rose-500 select-none shrink-0 font-semibold">-</span>
                    <span className="text-[var(--text-primary)] font-mono whitespace-pre break-all">{line || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Draggable Slider Thumb */}
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ left: `${sliderPos}%` }}
            className={cn(
              'absolute top-0 bottom-0 -ml-3.5 w-7 cursor-ew-resize flex items-center justify-center z-30 transition-shadow',
              isDragging ? 'scale-110' : ''
            )}
          >
            <div className="size-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-black transition-transform hover:scale-110">
              <Split className="w-3 h-3 rotate-90" />
            </div>
          </div>
        </div>
      ) : (
        /* Side-by-Side Dual Pane */
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-workspace)] font-mono text-xs bg-[var(--bg-workspace)]">
          {/* Before Pane */}
          <div className="p-4 overflow-x-auto leading-relaxed">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-workspace)] text-[11px] font-semibold text-rose-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>Before (Original)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(beforeCode, true)}
                className="cursor-pointer text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {copiedBefore ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="space-y-0.5">
              {beforeLines.map((line, idx) => (
                <div key={`side-before-${idx}`} className="flex items-start gap-2 px-1 py-0.5 bg-rose-500/5 rounded">
                  <span className="w-6 text-right text-[var(--text-secondary)] opacity-40 select-none shrink-0 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="text-rose-500 select-none">-</span>
                  <span className="text-[var(--text-primary)] whitespace-pre break-all">{line || ' '}</span>
                </div>
              ))}
            </div>
          </div>

          {/* After Pane */}
          <div className="p-4 overflow-x-auto leading-relaxed">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-workspace)] text-[11px] font-semibold text-emerald-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>After (Updated)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(afterCode, false)}
                className="cursor-pointer text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {copiedAfter ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="space-y-0.5">
              {afterLines.map((line, idx) => (
                <div key={`side-after-${idx}`} className="flex items-start gap-2 px-1 py-0.5 bg-emerald-500/5 rounded">
                  <span className="w-6 text-right text-[var(--text-secondary)] opacity-40 select-none shrink-0 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="text-emerald-500 select-none">+</span>
                  <span className="text-[var(--text-primary)] whitespace-pre break-all">{line || ' '}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeComparisonTemplate;
