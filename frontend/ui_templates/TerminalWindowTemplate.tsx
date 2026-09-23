import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '../src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Terminal, Trash2, CornerDownLeft, Loader2 } from 'lucide-react';

export interface TerminalLine {
  id?: string;
  text: string;
  isCommand?: boolean;
  status?: 'success' | 'failed' | 'running';
  timestamp?: string;
}

export interface TerminalWindowTemplateProps {
  commands?: { text: string; delay?: number }[];
  initialLines?: TerminalLine[];
  className?: string;
  title?: string;
  allowInput?: boolean;
  onExecuteCommand?: (cmd: string) => Promise<string | void>;
}

export const TerminalWindowTemplate: React.FC<TerminalWindowTemplateProps> = ({
  commands,
  initialLines,
  className,
  title = 'ERIS Win32 Sandbox',
  allowInput = true,
  onExecuteCommand,
}) => {
  const [lines, setLines] = useState<TerminalLine[]>(() => {
    if (initialLines && initialLines.length > 0) return initialLines;
    if (commands && commands.length > 0) {
      return commands.map((c, i) => ({
        id: `cmd-${i}`,
        text: c.text,
        isCommand: c.text.startsWith('$'),
        status: 'success',
      }));
    }
    return [
      { id: 'welcome', text: '❖ ERIS Win32 Subprocess Terminal & Process Sandbox', isCommand: false, status: 'success' },
      { id: 'hint', text: 'Type any shell command (e.g. `dir`, `python --version`, `git status`) and press Enter.', isCommand: false },
    ];
  });

  const [inputVal, setInputVal] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isExecuting]);

  // Sync with prop changes
  useEffect(() => {
    if (commands && commands.length > 0) {
      setLines(
        commands.map((c, i) => ({
          id: `sync-${i}`,
          text: c.text,
          isCommand: c.text.startsWith('$'),
          status: 'success',
        }))
      );
    }
  }, [commands]);

  const handleCopyAll = () => {
    const fullText = lines.map((l) => (l.isCommand ? `$ ${l.text}` : l.text)).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLines([
      { id: 'cleared', text: 'Terminal cleared.', isCommand: false }
    ]);
  };

  const handleRunCommand = useCallback(
    async (cmdToRun: string) => {
      const cleanCmd = cmdToRun.trim();
      if (!cleanCmd || isExecuting) return;

      // Add to command history
      setHistory((prev) => [cleanCmd, ...prev.filter((c) => c !== cleanCmd)]);
      setHistoryIdx(-1);

      // Add command line to display
      const cmdId = `cmd-${Date.now()}`;
      setLines((prev) => [
        ...prev,
        { id: cmdId, text: cleanCmd, isCommand: true, status: 'running' },
      ]);
      setInputVal('');
      setIsExecuting(true);

      try {
        if (onExecuteCommand) {
          const customRes = await onExecuteCommand(cleanCmd);
          if (customRes) {
            setLines((prev) => [
              ...prev.map((l) => (l.id === cmdId ? { ...l, status: 'success' as const } : l)),
              { id: `out-${Date.now()}`, text: String(customRes), isCommand: false, status: 'success' },
            ]);
          }
        } else {
          // Call live backend process sandbox
          const res = await fetch('/api/chat/terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cleanCmd }),
          });
          const data = await res.json();
          const outText = data.output || '(Execution completed with no output)';

          setLines((prev) => [
            ...prev.map((l) => (l.id === cmdId ? { ...l, status: data.ok ? ('success' as const) : ('failed' as const) } : l)),
            {
              id: `out-${Date.now()}`,
              text: outText,
              isCommand: false,
              status: data.ok ? 'success' : 'failed',
            },
          ]);
        }
      } catch (err) {
        setLines((prev) => [
          ...prev.map((l) => (l.id === cmdId ? { ...l, status: 'failed' as const } : l)),
          { id: `err-${Date.now()}`, text: `Terminal error: ${err}`, isCommand: false, status: 'failed' },
        ]);
      } finally {
        setIsExecuting(false);
      }
    },
    [isExecuting, onExecuteCommand]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    }
  };

  return (
    <div
      className={cn(
        'w-full rounded-xl overflow-hidden shadow-2xl flex flex-col bg-[#0A0D14] border border-white/10 font-mono text-[13px] text-neutral-200 select-text',
        className
      )}
    >
      {/* Window Chrome Header */}
      <div className="h-10 w-full flex items-center justify-between px-3.5 bg-[#111622] border-b border-white/10 select-none">
        {/* Traffic Lights */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/20" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/20" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/20" />
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-xs text-neutral-400 font-sans font-medium">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{title}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy terminal output"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-sans">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] font-sans">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Console Buffer */}
      <div
        ref={scrollRef}
        className="p-4 flex-1 overflow-y-auto max-h-[340px] min-h-[160px] flex flex-col gap-1.5 leading-relaxed"
      >
        <AnimatePresence initial={false}>
          {lines.map((line, idx) => {
            const isCmd = line.isCommand;
            return (
              <motion.div
                key={line.id || idx}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn('flex flex-col text-[12.5px]', isCmd ? 'mt-1' : '')}
              >
                {isCmd ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 select-none font-bold">$</span>
                    <span className="text-white font-semibold">{line.text.replace(/^\$\s*/, '')}</span>
                    {line.status === 'running' && (
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin ml-1" />
                    )}
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-neutral-300 break-words">
                    {line.text}
                  </pre>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isExecuting && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-sans italic my-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Executing in Win32 sandbox...</span>
          </div>
        )}
      </div>

      {/* Interactive Command Input Line */}
      {allowInput && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#0D111A] border-t border-white/10 select-none">
          <span className="text-emerald-400 font-bold select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isExecuting ? 'Waiting for execution...' : 'Type command (e.g. dir, python run.py, uv pip list)...'}
            disabled={isExecuting}
            className="flex-1 bg-transparent border-none outline-none font-mono text-[12.5px] text-white placeholder:text-neutral-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleRunCommand(inputVal)}
            disabled={!inputVal.trim() || isExecuting}
            className={cn(
              'p-1.5 rounded-md transition-colors flex items-center justify-center cursor-pointer',
              inputVal.trim() && !isExecuting
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'text-neutral-600 opacity-40 cursor-not-allowed'
            )}
            title="Execute (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
