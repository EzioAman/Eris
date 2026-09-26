import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  CheckCircle2, 
  Workflow, 
  HelpCircle, 
  Check, 
  Loader2,
  FileCode2,
  FolderTree,
  Search,
  Terminal,
  Globe,
  Wrench,
  Copy
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ToolOutputItem, ToolApprovalItem, ScheduledTaskItem } from './chatTypes';
import { 
  TerminalWindowTemplate, 
  CodeComparisonTemplate,
  SafariBrowserTemplate,
  PixelImageTemplate
} from '../../../ui_templates';

/* ─── Streaming Blur-In Word Animator ────────────────────── */
export const StreamingWords: React.FC<{ text: string }> = ({ text }) => {
  const words = useMemo(() => text.match(/\S+\s*/g) ?? [], [text]);
  return (
    <>
      {words.map((word, idx) => (
        <motion.span
          key={`${idx}-${word}`}
          initial={{ opacity: 0, filter: 'blur(3px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="inline-block whitespace-pre-wrap"
        >
          {word}
        </motion.span>
      ))}
    </>
  );
};

/* ─── Collapsible Tool Output Card (Theme Aware) ─────────── */
/* ─── Collapsible Tool Output Card (Modern Ergonomic Design) ─── */
interface ToolMeta {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeColor: string;
  label: string;
}

const getToolMeta = (toolName: string, isDarkMode: boolean): ToolMeta => {
  const lower = toolName.toLowerCase();
  if (lower.includes('read_file') || lower.includes('view_file') || lower.includes('cat')) {
    return {
      icon: FileCode2,
      badgeColor: isDarkMode
        ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
        : 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Read File',
    };
  }
  if (lower.includes('write_to_file') || lower.includes('replace_file') || lower.includes('edit_code')) {
    return {
      icon: FileCode2,
      badgeColor: isDarkMode
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: 'Write File',
    };
  }
  if (lower.includes('list_dir') || lower.includes('file_tree') || lower.includes('tree')) {
    return {
      icon: FolderTree,
      badgeColor: isDarkMode
        ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
        : 'bg-purple-50 text-purple-800 border-purple-200',
      label: 'Directory',
    };
  }
  if (lower.includes('grep_search') || lower.includes('search') || lower.includes('find')) {
    return {
      icon: Search,
      badgeColor: isDarkMode
        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
        : 'bg-cyan-50 text-cyan-800 border-cyan-200',
      label: 'Search',
    };
  }
  if (lower.includes('run_command') || lower.includes('bash') || lower.includes('terminal') || lower.includes('shell')) {
    return {
      icon: Terminal,
      badgeColor: isDarkMode
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: 'Command',
    };
  }
  if (lower.includes('browser') || lower.includes('url') || lower.includes('fetch') || lower.includes('web')) {
    return {
      icon: Globe,
      badgeColor: isDarkMode
        ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
        : 'bg-sky-50 text-sky-800 border-sky-200',
      label: 'Browser',
    };
  }
  return {
    icon: Wrench,
    badgeColor: isDarkMode
      ? 'bg-neutral-500/10 text-neutral-300 border-neutral-500/25'
      : 'bg-slate-100 text-slate-800 border-slate-200',
    label: 'Tool',
  };
};

export const ToolOutputCard: React.FC<{ tool: ToolOutputItem; isDarkMode: boolean }> = ({
  tool,
  isDarkMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanFullName = tool.name.replace(/^CALL_TOOL\s*/i, '').trim();
  const firstSpaceIdx = cleanFullName.indexOf(' ');
  const actionName = firstSpaceIdx > -1 ? cleanFullName.slice(0, firstSpaceIdx) : cleanFullName;
  const targetParam = firstSpaceIdx > -1 ? cleanFullName.slice(firstSpaceIdx + 1).trim() : '';

  const meta = getToolMeta(actionName || tool.name, isDarkMode);
  const ToolIcon = meta.icon;

  const outputString =
    typeof tool.output === 'string'
      ? tool.output
      : JSON.stringify(tool.output, null, 2);

  const lineCount = outputString ? outputString.split('\n').length : 0;
  const byteSize = outputString ? new Blob([outputString]).size : 0;
  const formattedSize = byteSize > 1024 ? `${(byteSize / 1024).toFixed(1)} KB` : `${byteSize} B`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(outputString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full my-1.5 font-sans">
      <div
        className={cn(
          'rounded-xl border transition-all duration-150 overflow-hidden',
          isDarkMode
            ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
            : 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
        )}
      >
        {/* Card Header / Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors select-none',
            isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
          )}
        >
          {/* Tool Icon Badge */}
          <div
            className={cn(
              'h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
              meta.badgeColor
            )}
          >
            <ToolIcon size={14} />
          </div>

          {/* Action & Parameter Text */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={cn(
                'text-[12px] font-mono font-semibold tracking-tight uppercase shrink-0',
                isDarkMode ? 'text-neutral-200' : 'text-slate-800'
              )}
            >
              {actionName}
            </span>

            {targetParam && (
              <span
                className={cn(
                  'text-[12px] font-mono truncate px-1.5 py-0.5 rounded border max-w-[280px] sm:max-w-md',
                  isDarkMode
                    ? 'bg-black/30 border-white/5 text-neutral-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                )}
                title={targetParam}
              >
                {targetParam}
              </span>
            )}
          </div>

          {/* Status & Duration Badge */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border',
                isDarkMode
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              )}
            >
              <CheckCircle2 size={11} />
              <span>Done</span>
            </span>

            {tool.duration && (
              <span
                className={cn(
                  'text-[11px] font-mono tabular-nums opacity-60 hidden sm:inline',
                  isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                )}
              >
                {tool.duration}
              </span>
            )}

            <ChevronRight
              size={14}
              className={cn(
                'shrink-0 transition-transform duration-200',
                isOpen && 'rotate-90',
                isDarkMode ? 'text-neutral-400' : 'text-slate-400'
              )}
            />
          </div>
        </button>

        {/* Expandable Output Drawer */}
        {isOpen && (
          <div
            className={cn(
              'border-t px-3 py-2.5 space-y-2',
              isDarkMode
                ? 'border-white/10 bg-black/40'
                : 'border-slate-200 bg-slate-50/70'
            )}
          >
            {/* Drawer Sub-header */}
            <div className="flex items-center justify-between text-[11px] font-mono opacity-80 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Output preview</span>
                <span>•</span>
                <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                <span>•</span>
                <span>{formattedSize}</span>
                {tool.spooled && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">Spooled to disk artifact</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors',
                  isDarkMode
                    ? 'hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                    : 'hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                )}
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {tool.artifact_path && (
              <div
                className={cn(
                  'text-[11px] font-mono px-2 py-1 rounded border break-all',
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                )}
              >
                Saved to artifact: <code className="select-all underline">{tool.artifact_path}</code>
              </div>
            )}

            {/* Template or Preformatted Output */}
            {(() => {
              const nameLower = tool.name.toLowerCase();

              // Use TerminalTemplate if it looks like a shell command
              if (nameLower.includes('run_command') || nameLower.includes('bash') || nameLower.includes('shell')) {
                const lines = outputString.split('\n').map((line) => ({ text: line, delay: 40 }));
                return <TerminalWindowTemplate commands={lines} className="max-h-64" />;
              }

              // Use CodeComparison if it looks like a diff or edit
              if (nameLower.includes('replace_file') || nameLower.includes('edit_code')) {
                return (
                  <CodeComparisonTemplate
                    beforeCode="// Previous state..."
                    afterCode={outputString}
                    fileName={targetParam || tool.name}
                  />
                );
              }

              // Use SafariBrowserTemplate if output is URL
              if (outputString.startsWith('http://') || outputString.startsWith('https://')) {
                if (outputString.match(/\.(jpeg|jpg|gif|png)$/)) {
                  return <PixelImageTemplate src={outputString} className="max-h-64" />;
                }
                return <SafariBrowserTemplate url={outputString} className="max-h-64" />;
              }

              // Default code / pre block
              return (
                <div
                  className={cn(
                    'relative rounded-lg border overflow-hidden',
                    isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200 bg-white'
                  )}
                >
                  <pre
                    className={cn(
                      'max-h-60 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap select-text',
                      isDarkMode ? 'text-neutral-200' : 'text-slate-700'
                    )}
                  >
                    {outputString || '<Empty Output>'}
                  </pre>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Step Marker for Connected List (User Template) ─────── */
export const StepMarker: React.FC<{
  status: 'pending' | 'active' | 'input' | 'done' | 'denied';
  isDarkMode?: boolean;
}> = ({ status, isDarkMode = false }) => {
  const base = cn(
    'w-4 h-4 rounded-full flex items-center justify-center shrink-0 z-10 border transition-all duration-150',
    isDarkMode ? 'bg-[#10131B]' : 'bg-white'
  );
  if (status === 'done') {
    return (
      <div className={cn(base, 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40')}>
        <Check size={10} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
      </div>
    );
  }
  if (status === 'denied') {
    return (
      <div className={cn(base, 'border-rose-400 bg-rose-50 dark:bg-rose-950/40')}>
        <span className="text-[10px] font-bold leading-none text-rose-600 dark:text-rose-400">✕</span>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className={cn(base, isDarkMode ? 'border-neutral-700' : 'border-neutral-300')}>
        <Loader2 size={10} className="text-neutral-500 animate-spin" />
      </div>
    );
  }
  if (status === 'input') {
    return (
      <div className={cn(base, 'border-amber-400 bg-amber-50 dark:bg-amber-950/40')}>
        <HelpCircle size={10} className="text-amber-600 dark:text-amber-400" />
      </div>
    );
  }
  return <div className={cn(base, isDarkMode ? 'border-neutral-800' : 'border-neutral-200')} />;
};

/* ─── Connected Step Item (User Template) ─────────────────── */
export const StepItem: React.FC<{
  status: 'pending' | 'active' | 'input' | 'done' | 'denied';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  activeLabel?: string;
  isLast?: boolean;
  isDarkMode?: boolean;
  children?: React.ReactNode;
}> = ({ status, icon: Icon, label, activeLabel, isLast = false, isDarkMode = false, children }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(children) && status === 'done';
  const dim = status === 'pending';

  return (
    <div className="flex gap-2.5 my-1 font-sans w-full">
      {/* marker + connecting line */}
      <div className="flex flex-col items-center">
        <StepMarker status={status} isDarkMode={isDarkMode} />
        {!isLast && <div className={cn('w-px flex-1 my-0.5', isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200')} />}
      </div>

      {/* content */}
      <div className="pb-2.5 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => hasDetail && setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center gap-1.5 text-xs -mt-0.5 text-left transition-colors',
            dim
              ? isDarkMode ? 'text-neutral-600' : 'text-neutral-300'
              : status === 'active'
                ? isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                : isDarkMode ? 'text-neutral-200' : 'text-neutral-700',
            hasDetail
              ? isDarkMode ? 'hover:text-white cursor-pointer' : 'hover:text-neutral-900 cursor-pointer'
              : 'cursor-default'
          )}
        >
          {Icon && <Icon size={11} className={cn('shrink-0', dim && 'opacity-40')} />}
          <span className="truncate">{status === 'active' ? activeLabel || label : label}</span>
          {hasDetail && (
            <ChevronRight
              size={12}
              className={cn('shrink-0 ml-auto transition-transform duration-200', open && 'rotate-90')}
            />
          )}
        </button>

        {hasDetail && open && (
          <div className={cn(
            'mt-1.5 text-xs leading-relaxed p-2.5 rounded-lg border',
            isDarkMode ? 'border-neutral-800 bg-black/40 text-neutral-400' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
          )}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Decided Approval Status Pill (Connected Step Collapse) ─────────── */
export const DecidedStatusPill: React.FC<{
  denied?: boolean;
  result: string;
  isDarkMode: boolean;
  actionTitle?: string;
}> = ({ denied = false, result, isDarkMode, actionTitle }) => {
  const [open, setOpen] = useState(false);
  const cleanTitle = actionTitle ? actionTitle.replace(/^Execute\s+|^Approve\s+&?\s*/i, '').trim() : '';
  const choiceText = denied
    ? 'Reject / Cancel'
    : cleanTitle
    ? `Approve & ${cleanTitle}`
    : 'Approve & Execute';

  return (
    <div className="flex gap-2.5 my-1.5 font-sans w-full">
      <div className="flex flex-col items-center">
        <StepMarker status={denied ? 'denied' : 'done'} isDarkMode={isDarkMode} />
      </div>

      <div className="pb-1.5 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center gap-1.5 text-xs -mt-0.5 cursor-pointer text-left transition-colors',
            isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-neutral-700 hover:text-neutral-900'
          )}
        >
          <HelpCircle size={11} className={cn('shrink-0', isDarkMode ? 'text-neutral-400' : 'text-neutral-500')} />
          <span className="truncate">
            Needs your input — you chose &ldquo;{choiceText}&rdquo;
          </span>
          <ChevronRight
            size={12}
            className={cn('shrink-0 ml-auto transition-transform duration-200', open && 'rotate-90')}
          />
        </button>

        {open && (
          <div className={cn(
            'mt-2 text-xs leading-relaxed p-2.5 rounded-lg border',
            isDarkMode ? 'border-neutral-800 bg-black/40' : 'border-neutral-200 bg-neutral-50'
          )}>
            <span className={cn('font-semibold block mb-0.5', denied ? 'text-rose-500' : 'text-emerald-500')}>
              {denied ? 'Rejected / Cancelled' : 'Confirmed & Executed'}
            </span>
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}>{result}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Inline Approval Gate Card (Connected InputStepItem Template) ────── */
export const InlineApprovalCard: React.FC<{
  tool: ToolApprovalItem;
  onDecision: (approved: boolean) => void;
  isExecuting?: boolean;
  isDarkMode: boolean;
}> = ({ tool, onDecision, isExecuting = false, isDarkMode }) => {
  const [showPayload, setShowPayload] = useState(false);

  const actionText = tool.action || 'Execute Action';
  const isEmail = actionText.toLowerCase().includes('email') || (tool.command || '').includes('send_email');
  const approveLabel = isEmail ? 'Approve & Send email' : 'Approve & Run';
  const rejectLabel = 'Reject / Cancel';

  return (
    <div className="flex gap-2.5 my-2 font-sans w-full">
      {/* Marker + connecting line */}
      <div className="flex flex-col items-center">
        <StepMarker status={isExecuting ? 'active' : 'input'} isDarkMode={isDarkMode} />
        <div className={cn('w-px flex-1 my-0.5', isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200')} />
      </div>

      <div className="pb-3 flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-1.5 text-xs -mt-0.5 font-medium">
          <HelpCircle size={11} className="text-amber-500 shrink-0" />
          <span className={isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}>
            Needs your input
          </span>
          {tool.riskLevel && (
            <span
              className={cn(
                'ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium',
                isDarkMode
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-rose-300 bg-rose-50 text-rose-600'
              )}
            >
              {tool.riskLevel} impact
            </span>
          )}
        </div>

        {/* Question card + vertical list of tappable options */}
        <div
          className={cn(
            'mt-2 rounded-lg border overflow-hidden shadow-sm transition-all',
            isDarkMode
              ? 'border-amber-500/30 bg-amber-950/20 text-neutral-100'
              : 'border-amber-200 bg-amber-50/70 text-amber-950'
          )}
        >
          <div className="px-3 pt-2.5 pb-2">
            <p className={cn('text-xs font-semibold leading-snug', isDarkMode ? 'text-white' : 'text-amber-950')}>
              {tool.action}
            </p>
            {tool.consequence && (
              <p
                className={cn(
                  'mt-1 text-xs leading-relaxed whitespace-pre-wrap',
                  isDarkMode ? 'text-neutral-300' : 'text-amber-900/80'
                )}
              >
                {tool.consequence}
              </p>
            )}

            {tool.input && (
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowPayload((p) => !p)}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium transition-colors',
                    isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-900'
                  )}
                >
                  <ChevronRight size={11} className={cn('transition-transform duration-150', showPayload && 'rotate-90')} />
                  {showPayload ? 'Hide details' : 'Show details'}
                </button>
                {showPayload && (
                  <pre
                    className={cn(
                      'mt-1.5 max-h-48 overflow-y-auto rounded border p-2 font-mono text-[11px] leading-relaxed',
                      isDarkMode
                        ? 'border-white/10 bg-black/70 text-amber-200/90'
                        : 'border-amber-200 bg-white/90 text-slate-700'
                    )}
                  >
                    {tool.input}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Vertical list of tappable options */}
          <div className={cn('border-t', isDarkMode ? 'border-amber-500/20' : 'border-amber-200/70')}>
            <button
              type="button"
              disabled={isExecuting}
              onClick={() => onDecision(true)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors border-b cursor-pointer font-medium',
                isDarkMode
                  ? 'bg-white/[0.04] hover:bg-white/[0.09] text-white border-white/10'
                  : 'bg-white hover:bg-amber-100/70 text-amber-950 border-amber-200/70'
              )}
            >
              <span>{isExecuting ? 'Executing...' : approveLabel}</span>
              {isExecuting ? (
                <Loader2 size={12} className="animate-spin text-amber-400" />
              ) : (
                <ChevronRight size={12} className="shrink-0 text-amber-500" />
              )}
            </button>
            <button
              type="button"
              disabled={isExecuting}
              onClick={() => onDecision(false)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors cursor-pointer',
                isDarkMode
                  ? 'bg-white/[0.01] hover:bg-rose-500/10 text-neutral-400 hover:text-rose-300'
                  : 'bg-white/80 hover:bg-rose-50 text-neutral-600 hover:text-rose-700'
              )}
            >
              <span>{rejectLabel}</span>
              <ChevronRight size={12} className="shrink-0 opacity-50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Inline Flow Preview Card ────── */
export const InlineFlowCard: React.FC<{
  task: ScheduledTaskItem;
  onOpenFlow: (task: ScheduledTaskItem) => void;
  isDarkMode: boolean;
}> = ({ task, onOpenFlow, isDarkMode }) => {
  return (
    <div
      className={cn(
        'my-2 rounded-2xl border p-4 shadow-md font-sans transition-all space-y-3',
        isDarkMode
          ? 'border-indigo-500/20 bg-gradient-to-br from-[#121622] to-[#0d1017] text-neutral-100'
          : 'border-blue-200 bg-gradient-to-br from-blue-50/70 to-white text-slate-800'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
            ❖
          </span>
          <div>
            <h4 className="text-xs font-semibold">{task.title}</h4>
          </div>
        </div>
        <span
          className={cn(
            'text-[11px] font-mono px-2 py-0.5 rounded uppercase font-semibold',
            isDarkMode
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'bg-blue-100 text-blue-700'
          )}
        >
          {task.status}
        </span>
      </div>

      <p
        className={cn(
          'text-xs leading-relaxed',
          isDarkMode ? 'text-neutral-300' : 'text-slate-600'
        )}
      >
        {task.summary}
      </p>

      {/* Visual Pipeline Nodes Mini-Rail */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar">
        {task.steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 flex items-center gap-1.5',
                step.status === 'completed'
                  ? isDarkMode
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : step.status === 'active'
                    ? isDarkMode
                      ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300 animate-pulse'
                      : 'border-blue-300 bg-blue-50 text-blue-700 animate-pulse'
                    : isDarkMode
                      ? 'border-white/10 bg-white/5 text-neutral-400'
                      : 'border-slate-200 bg-slate-100 text-slate-500'
              )}
            >
              {step.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              <span>{step.name}</span>
            </div>
            {idx < task.steps.length - 1 && (
              <span className={isDarkMode ? 'text-neutral-600 text-xs' : 'text-slate-300 text-xs'}>
                →
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="pt-1 flex items-center justify-between">
        <span
          className={cn(
            'text-[11px] font-mono',
            isDarkMode ? 'text-neutral-400' : 'text-slate-400'
          )}
        >
          {task.steps.length} steps
        </span>
        <button
          type="button"
          onClick={() => onOpenFlow(task)}
          className={cn(
            'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all',
            isDarkMode
              ? 'bg-indigo-600 text-white hover:bg-indigo-500'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          <Workflow className="w-3.5 h-3.5" />
          Open Flow Canvas
        </button>
      </div>
    </div>
  );
};
