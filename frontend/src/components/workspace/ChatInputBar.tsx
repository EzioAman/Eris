import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Paperclip,
  Globe,
  ArrowUp,
  Square,
  X,
  FileText,
  Terminal,
  Cpu,
  Eraser,
  HelpCircle,
  UserCheck,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileUploadTemplate } from '../../../ui_templates/FileUploadTemplate';

interface TokenUsageData {
  used: number;
  total: number;
  modelName?: string;
  provider?: string;
}

const TokenUsageIndicator: React.FC<{
  isDarkMode: boolean;
  tokenData: TokenUsageData;
  onHoverChange: (hovered: boolean) => void;
}> = ({ isDarkMode, tokenData, onHoverChange }) => {
  const percentage = Math.max(1, Math.min(100, Math.round((tokenData.used / tokenData.total) * 100)));
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const gaugeColor = percentage > 90 ? '#EF4444' : percentage > 75 ? '#F59E0B' : isDarkMode ? '#3B82F6' : '#2563EB';

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-pointer select-none"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={() => onHoverChange(true)}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth="2.5"
        />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke={gaugeColor}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="text-xs font-mono opacity-80">{percentage}%</span>
    </div>
  );
};

export interface ChatInputBarProps {
  isDarkMode: boolean;
  isStreaming: boolean;
  onSendMessage: (msg: string, isWebSearch?: boolean) => void;
  onStopStreaming: () => void;
  onOpenBrowser?: (url?: string) => void;
  conversationMessages?: { text?: string }[];
  chatZoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

interface SlashCommand {
  cmd: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/compare', label: '/compare', description: 'Magic UI interactive code comparison & diff viewer', icon: FileText },
  { cmd: '/terminal', label: '/terminal', description: 'Open interactive sandbox terminal shell', icon: Terminal },
  { cmd: '/browser', label: '/browser <url>', description: 'Open live web inspector & scraper', icon: Globe },
  { cmd: '/tools', label: '/tools', description: 'Inspect verified dynamic tools in tools/', icon: Terminal },
  { cmd: '/model', label: '/model <id>', description: 'Switch active LLM model across Matrix', icon: Cpu },
  { cmd: '/clear', label: '/clear', description: 'Wipe conversation episodic memory', icon: Eraser },
  { cmd: '/whoami', label: '/whoami', description: 'Inspect active session identity & creator details', icon: UserCheck },
  { cmd: '/help', label: '/help', description: 'Show interactive command reference', icon: HelpCircle },
];

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  isDarkMode,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onOpenBrowser,
  conversationMessages,
  chatZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showUploaderDrawer, setShowUploaderDrawer] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // Live real model config from backend
  const [activeModelInfo, setActiveModelInfo] = useState<{
    name: string;
    provider: string;
    contextWindow: number;
  }>({
    name: 'No model selected',
    provider: 'None',
    contextWindow: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const [liveTokenUsage, setLiveTokenUsage] = useState<number | null>(null);

  useEffect(() => {
    const fetchInfo = () => {
      fetch('/api/system/models')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.active_model) {
            const act = data.active_model;
            const found = (data.models || []).find((m: any) => m.id === act);
            const isGemini = act.toLowerCase().includes('gemini');
            const contextWin = found?.contextWindow || (isGemini ? 1048576 : 131072);
            setActiveModelInfo({
              name: found?.name || act,
              provider: found?.provider || (isGemini ? 'Gemini' : 'Provider'),
              contextWindow: contextWin,
            });
          } else {
            setActiveModelInfo({
              name: 'No model selected',
              provider: 'None',
              contextWindow: 0,
            });
          }
        })
        .catch(() => {});
    };

    const handleErisPaste = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail) {
        setInputValue((prev) => prev + customEvt.detail);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    const handleTokenUsage = (e: Event) => {
      const customEvt = e as CustomEvent<{ usage?: { total_tokens?: number } }>;
      if (customEvt.detail?.usage?.total_tokens) {
        setLiveTokenUsage(customEvt.detail.usage.total_tokens);
      }
    };

    fetchInfo();
    window.addEventListener('eris:model-changed', fetchInfo);
    window.addEventListener('eris:paste', handleErisPaste);
    window.addEventListener('eris:token-usage', handleTokenUsage);
    return () => {
      window.removeEventListener('eris:model-changed', fetchInfo);
      window.removeEventListener('eris:paste', handleErisPaste);
      window.removeEventListener('eris:token-usage', handleTokenUsage);
    };
  }, []);

  const filteredCommands = SLASH_COMMANDS.filter((sc) =>
    inputValue.startsWith('/') ? sc.cmd.toLowerCase().includes(inputValue.toLowerCase()) : true
  );

  const handleSend = () => {
    if (inputValue.trim().length === 0 && attachedFiles.length === 0) return;

    let finalMsg = inputValue;
    if (attachedFiles.length > 0) {
      finalMsg = `[Attached files: ${attachedFiles.join(', ')}]\n${inputValue}`;
    }

    onSendMessage(finalMsg, webSearchEnabled);
    setInputValue('');
    setAttachedFiles([]);
    setShowSlashMenu(false);
    setShowUploaderDrawer(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSelectSlashCommand = (cmd: string) => {
    if (cmd === '/model') {
      setInputValue('/model ');
    } else {
      setInputValue(cmd);
    }
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const [showTokenPopover, setShowTokenPopover] = useState(false);
  const currentTokenData = useMemo(() => {
    const totalChars =
      (conversationMessages || []).reduce((sum, m) => sum + (m.text?.length || 0), 0) +
      inputValue.length;
    const estimatedTokens = Math.ceil(totalChars / 4);
    const used = liveTokenUsage !== null && liveTokenUsage > 0 ? liveTokenUsage : estimatedTokens;
    const total = activeModelInfo.contextWindow > 0 ? activeModelInfo.contextWindow : 1048576;
    return {
      used,
      total,
      modelName: activeModelInfo.name,
      provider: activeModelInfo.provider,
    };
  }, [conversationMessages, inputValue, activeModelInfo, liveTokenUsage]);

  return (
    <div className="shrink-0 p-3 sm:p-4 md:p-6 z-20 relative font-sans">
      <div className="max-w-2xl mx-auto w-full relative">
        {/* Floating Context Window Usage Telemetry (Floats above entire input box without obscuring textarea) */}
        {showTokenPopover && (
          <div
            onMouseEnter={() => setShowTokenPopover(true)}
            onMouseLeave={() => setShowTokenPopover(false)}
            className={cn(
              'absolute bottom-full right-0 mb-3 p-3.5 rounded-2xl border min-w-[280px] shadow-2xl text-xs z-50 font-sans backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150',
              isDarkMode ? 'bg-[#141824]/95 border-white/10 text-neutral-200' : 'bg-white/95 border-slate-200 text-slate-700'
            )}
          >
            {currentTokenData.modelName && (
              <p className="mb-1.5 font-semibold text-[13px]">
                {currentTokenData.modelName}
                {currentTokenData.provider && <span className="font-normal opacity-60 ml-1.5">/ {currentTokenData.provider}</span>}
              </p>
            )}
            <p className="mb-1">
              Used tokens: <span className="font-mono font-medium">{currentTokenData.used.toLocaleString()}</span>
            </p>
            <p className="mb-1">
              Context window: <span className="font-mono font-medium">{currentTokenData.total.toLocaleString()}</span>
            </p>
            <p className="mb-2 opacity-70">
              Remaining: <span className="font-mono font-medium">{Math.max(0, currentTokenData.total - currentTokenData.used).toLocaleString()}</span> tokens
            </p>
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all rounded-full"
                style={{
                  width: `${Math.max(1, Math.min(100, Math.round((currentTokenData.used / currentTokenData.total) * 100)))}%`,
                  backgroundColor:
                    (currentTokenData.used / currentTokenData.total) > 0.9
                      ? '#EF4444'
                      : (currentTokenData.used / currentTokenData.total) > 0.75
                      ? '#F59E0B'
                      : isDarkMode
                      ? '#3B82F6'
                      : '#2563EB'
                }}
              />
            </div>
          </div>
        )}
        {/* Floating Slash Command Menu */}
        {(showSlashMenu || (inputValue.startsWith('/') && filteredCommands.length > 0)) && (
          <div
            ref={slashMenuRef}
            className={cn(
              'absolute bottom-full left-0 mb-2 w-full max-w-md rounded-2xl border p-1.5 shadow-2xl z-50 font-sans animate-in fade-in zoom-in-95 duration-150',
              isDarkMode ? 'bg-[#121622] border-white/10 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
            )}
          >
            <div className="px-3 py-1.5 border-b border-white/5 dark:border-white/5 flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>❖ Available Slash Commands</span>
              <span>Select or press Tab</span>
            </div>
            <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
              {filteredCommands.map((sc, idx) => {
                const Icon = sc.icon;
                const isSelected = idx === selectedSlashIndex;
                return (
                  <button
                    key={sc.cmd}
                    type="button"
                    onClick={() => handleSelectSlashCommand(sc.cmd)}
                    onMouseEnter={() => setSelectedSlashIndex(idx)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left cursor-pointer transition-colors',
                      isSelected
                        ? isDarkMode
                          ? 'bg-white/10 text-white'
                          : 'bg-blue-50 text-blue-800'
                        : isDarkMode
                        ? 'text-neutral-300 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <div className="size-6 rounded-lg flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5">
                      <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs font-semibold block">{sc.label}</span>
                      <span className="text-xs opacity-70 block truncate">{sc.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Untitled UI File Uploader Drawer */}
        {showUploaderDrawer && (
          <div
            className={cn(
              'mb-3 p-4 rounded-2xl border shadow-xl animate-in fade-in zoom-in-95 duration-150',
              isDarkMode ? 'bg-[#121622] border-white/10' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">
                Upload Workspace Files & Context
              </span>
              <button
                type="button"
                onClick={() => setShowUploaderDrawer(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <FileUploadTemplate
              isDarkMode={isDarkMode}
              maxSizeMB={25}
              onFilesSelected={(newFiles) => {
                const names = newFiles.map((f) => f.name);
                setAttachedFiles((prev) => [...prev, ...names]);
              }}
            />
          </div>
        )}

        {/* Main Input Card */}
        <div
          className={cn(
            'rounded-2xl border transition-all shadow-lg font-sans overflow-hidden backdrop-blur-xl',
            'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus-within:border-[var(--accent-primary)]'
          )}
        >
          {/* Attached Files & Search Pills */}
          {(attachedFiles.length > 0 || webSearchEnabled) && (
            <div
              className={cn(
                'px-3 pt-2.5 pb-1 flex flex-wrap gap-2 border-b',
                isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
              )}
            >
              {webSearchEnabled && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs animate-in fade-in',
                    isDarkMode
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web Browser Active</span>
                  <button
                    type="button"
                    onClick={() => setWebSearchEnabled(false)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {attachedFiles.map((fileName, idx) => (
                <div
                  key={`${fileName}-${idx}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border',
                    isDarkMode
                      ? 'bg-white/5 border-white/10 text-neutral-300'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  )}
                >
                  <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[140px]">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              if (val.startsWith('/')) {
                setShowSlashMenu(true);
              }
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
              }
            }}
            onKeyDown={(e) => {
              if (showSlashMenu && filteredCommands.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSlashIndex((prev) => (prev + 1) % filteredCommands.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSlashIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                  return;
                }
                if (e.key === 'Tab' || (e.key === 'Enter' && inputValue.startsWith('/'))) {
                  e.preventDefault();
                  handleSelectSlashCommand(filteredCommands[selectedSlashIndex].cmd);
                  return;
                }
                if (e.key === 'Escape') {
                  setShowSlashMenu(false);
                  return;
                }
              }

              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              webSearchEnabled
                ? 'Search the web, browse websites, or enter a URL...'
                : 'Hey there, what can I do for you? (Type / for commands)'
            }
            className={cn(
              'block max-h-40 w-full resize-none bg-transparent px-4 pt-3.5 text-sm leading-relaxed outline-none font-sans',
              isDarkMode ? 'text-neutral-100 placeholder-neutral-500' : 'text-slate-800 placeholder-slate-400'
            )}
          />

          {/* Action Row */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-transparent">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* File Attachment Button */}
              <button
                type="button"
                onClick={() => setShowUploaderDrawer((prev) => !prev)}
                title="Attach project files or data"
                className={cn(
                  'cursor-pointer inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg border transition-all text-xs font-medium',
                  showUploaderDrawer
                    ? isDarkMode
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                      : 'border-blue-300 bg-blue-50 text-blue-700'
                    : isDarkMode
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                )}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                Attach
              </button>

              {/* Slash Commands Dropdown Toggle Button */}
              <button
                type="button"
                onClick={() => setShowSlashMenu((prev) => !prev)}
                title="View / tool commands"
                className={cn(
                  'cursor-pointer inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg border transition-all text-xs font-mono font-medium',
                  showSlashMenu
                    ? isDarkMode
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 font-semibold'
                      : 'border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold'
                    : isDarkMode
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                )}
              >
                <Terminal className="h-3.5 w-3.5 shrink-0" />
                <span>/ Commands</span>
              </button>

              {/* Web Browser Toggle / Open Button */}
              <button
                type="button"
                onClick={() => {
                  const query = inputValue.trim();
                  if (query) {
                    if (query.startsWith('http://') || query.startsWith('https://')) {
                      onOpenBrowser?.(query);
                      setInputValue('');
                    } else {
                      // Trigger web search for the query
                      onSendMessage(query, true);
                      setInputValue('');
                    }
                  } else {
                    // Activate web search mode and insert /browser command to guide user
                    setWebSearchEnabled(true);
                    setInputValue('/browser ');
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }
                }}
                title={webSearchEnabled ? 'Web Search Mode Active (Click to search or enter URL)' : 'Search the Web or Open Browser'}
                className={cn(
                  'cursor-pointer inline-flex h-7 items-center gap-1.5 px-2.5 rounded-lg border transition-all text-xs font-medium',
                  webSearchEnabled
                    ? isDarkMode
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 font-semibold'
                      : 'border-blue-300 bg-blue-50 text-blue-700 font-semibold'
                    : isDarkMode
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs font-semibold'
                )}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span>Web Browser</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {chatZoom !== undefined && (
                <div
                  className={cn(
                    'group flex items-center gap-0.5 px-2 py-1 rounded-xl border text-xs font-mono transition-colors mr-1',
                    isDarkMode
                      ? 'border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:border-cyan-500/40'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:border-blue-400'
                  )}
                >
                  <button
                    type="button"
                    onClick={onZoomOut}
                    disabled={chatZoom <= 80}
                    title="Zoom out (Ctrl + Scroll Down)"
                    className="p-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onZoomReset}
                    title="Reset zoom (100%)"
                    className="px-1 font-medium transition-colors cursor-pointer"
                  >
                    {chatZoom}%
                  </button>
                  <button
                    type="button"
                    onClick={onZoomIn}
                    disabled={chatZoom >= 150}
                    title="Zoom in (Ctrl + Scroll Up)"
                    className="p-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="mr-2">
                <TokenUsageIndicator
                  isDarkMode={isDarkMode}
                  tokenData={currentTokenData}
                  onHoverChange={setShowTokenPopover}
                />
              </div>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  aria-label="Stop generating"
                  className={cn(
                    'cursor-pointer inline-flex h-8 items-center gap-1.5 px-3 rounded-xl border transition-all text-xs font-semibold font-sans',
                    isDarkMode
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                  )}
                >
                  <Square className="h-3 w-3 shrink-0 fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  aria-label="Send message"
                  disabled={inputValue.trim().length === 0 && attachedFiles.length === 0}
                  className={cn(
                    'cursor-pointer inline-flex size-8 items-center justify-center rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed shadow-sm',
                    isDarkMode
                      ? 'bg-cyan-500 text-neutral-950 hover:bg-cyan-400 disabled:bg-white/5 disabled:text-neutral-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400'
                  )}
                >
                  <ArrowUp className="h-4 w-4 shrink-0 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInputBar;
