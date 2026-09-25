import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Terminal as TerminalIcon, Sparkles, Lightbulb, Workflow, Globe, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatModelName } from '../../lib/modelUtils';
import type { ChatMessage, ScheduledTaskItem, ActiveThinkingState } from './chatTypes';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MarkdownContent } from './MarkdownContent';
import { ClaudeThinkingBlock } from './ClaudeThinkingBlock';
import { ErisAvatar } from '../ui/ErisAvatar';

export interface ChatCanvasProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  isDarkMode: boolean;
  userProfile?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  };
  activeThinking?: ActiveThinkingState | null;
  executingApprovalId?: string | null;
  onSendMessage: (msg: string) => void;
  onDecision: (toolId: string, approved: boolean) => void;
  onOpenFlow: (task: ScheduledTaskItem) => void;
  onOpenWorkflowBuilder?: () => void;
  onOpenModelConfig?: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  activeModel?: string;
}

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const ChatCanvas: React.FC<ChatCanvasProps> = ({
  messages,
  isStreaming,
  streamingText,
  isDarkMode,
  userProfile,
  activeThinking,
  executingApprovalId,
  onSendMessage,
  onDecision,
  onOpenFlow,
  onOpenWorkflowBuilder,
  onOpenModelConfig,
  scrollRef,
  activeModel,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceToBottom > 60) {
      setIsUserScrolledUp(true);
    } else if (distanceToBottom <= 15) {
      setIsUserScrolledUp(false);
    }
  }, []);

  // Detect upward wheel movement immediately
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < -2) {
      setIsUserScrolledUp(true);
    }
  }, []);

  // Detect upward touch movement
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current !== null) {
      const delta = e.touches[0].clientY - touchStartYRef.current;
      if (delta > 8) {
        setIsUserScrolledUp(true);
      }
    }
  }, []);

  // When user sends a message, snap back to bottom
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'user') {
        setIsUserScrolledUp(false);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  // Auto-scroll down when new messages or streaming tokens arrive, unless user has scrolled up
  useEffect(() => {
    if (!isUserScrolledUp && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: isStreaming ? 'auto' : 'smooth',
      });
    }
  }, [messages, streamingText, isStreaming, isUserScrolledUp]);

  const jumpToLatest = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setIsUserScrolledUp(false);
    }
  };

  const [chatZoom, setChatZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('eris_chat_zoom');
      return saved ? parseInt(saved, 10) : 100;
    } catch {
      return 100;
    }
  });

  const handleZoomIn = () => {
    setChatZoom((prev) => {
      const next = Math.min(prev + 10, 150);
      try {
        localStorage.setItem('eris_chat_zoom', String(next));
      } catch {}
      return next;
    });
  };

  const handleZoomOut = () => {
    setChatZoom((prev) => {
      const next = Math.max(prev - 10, 80);
      try {
        localStorage.setItem('eris_chat_zoom', String(next));
      } catch {}
      return next;
    });
  };

  const handleZoomReset = () => {
    setChatZoom(100);
    try {
      localStorage.setItem('eris_chat_zoom', '100');
    } catch {}
  };

  return (
    <main
      className={cn(
        'flex-1 flex flex-col relative overflow-hidden transition-colors w-full h-full',
        'bg-transparent text-[var(--text-primary)]'
      )}
    >
      {/* Floating Zoom Controls for Chat */}
      <div
        className={cn(
          'absolute top-3 right-4 z-20 flex items-center gap-1 px-2 py-1 rounded-full border shadow-xs backdrop-blur-md transition-all font-sans',
          isDarkMode
            ? 'bg-neutral-900/80 border-white/10 text-neutral-300'
            : 'bg-white/90 border-slate-200 text-slate-700'
        )}
      >
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={chatZoom <= 80}
          title="Zoom out chat"
          className={cn(
            'cursor-pointer p-1 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
            isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-slate-100 text-slate-600'
          )}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleZoomReset}
          title="Reset chat zoom (100%)"
          className={cn(
            'cursor-pointer px-1.5 py-0.5 rounded font-mono text-[11px] font-medium transition-colors',
            isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {chatZoom}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={chatZoom >= 150}
          title="Zoom in chat"
          className={cn(
            'cursor-pointer p-1 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
            isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-slate-100 text-slate-600'
          )}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Conversation Container */}
      <div
        ref={(el) => {
          (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (scrollRef && 'current' in scrollRef) {
            (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="smooth-scroll relative flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 flex flex-col [overflow-anchor:none]"
      >
        {messages.length === 0 && !isStreaming ? (
          <div className="my-auto flex flex-col justify-center items-center flex-1">
            <div className="max-w-2xl mx-auto w-full space-y-5">
              {/* Greeting Header */}
              <div className="text-center mb-6">
                <h2 className={cn('text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-800')}>
                  {getTimeGreeting()}, {userProfile?.displayName || userProfile?.username || 'there'}
                </h2>
                <p className={cn('text-sm mt-1', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
                  What would you like to work on?
                </p>
              </div>

              {/* Quick Action Starter Pills */}
              <span
                className={cn(
                  'text-[13px] font-medium block',
                  isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                )}
              >
                Quick Actions & System Tools
              </span>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenModelConfig?.()}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all shadow-xs font-semibold',
                    isDarkMode
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200'
                      : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
                  )}
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Choose Model
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWorkflowBuilder?.()}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all shadow-xs font-semibold',
                    isDarkMode
                      ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800'
                  )}
                >
                  <Workflow className="w-4 h-4 text-indigo-400" />
                  Workflow Studio
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage('/tools')}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all shadow-xs font-medium',
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-800'
                  )}
                >
                  <TerminalIcon className="w-4 h-4 text-neutral-400" />
                  View Registered Tools
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage('/health')}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all shadow-xs font-medium',
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-800'
                  )}
                >
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  Security & Health Audit
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage('/browser https://duckduckgo.com')}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all shadow-xs font-sans font-medium',
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white'
                      : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 hover:text-slate-900'
                  )}
                >
                  <Globe className="w-4 h-4 text-cyan-500" />
                  Web Browser
                </button>
              </div>
            </div>
          </div>
          <div
            className="max-w-3xl mx-auto w-full flex flex-col gap-6 origin-top transition-transform"
            style={{ zoom: `${chatZoom}%` }}
          >
            {messages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                msg={msg}
                isDarkMode={isDarkMode}
                executingApprovalId={executingApprovalId}
                userProfile={userProfile}
                onDecision={onDecision}
                onOpenFlow={onOpenFlow}
                onSendMessage={onSendMessage}
                activeModel={activeModel}
              />
            ))}

            {/* Live Streaming Assistant Message with Live State Avatar */}
            {isStreaming && (
              <div className="flex items-start gap-3 select-text font-sans group max-w-full">
                <div className="relative shrink-0 mt-0.5">
                  <ErisAvatar
                    size="md"
                    state={activeThinking ? 'thinking' : 'speaking'}
                    isThinking={!!activeThinking}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs font-semibold tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      ERIS
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1.5',
                        isDarkMode
                          ? 'border-white/10 bg-white/5 text-neutral-300'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full shrink-0', activeThinking ? 'bg-amber-400 animate-ping' : 'bg-blue-400 animate-pulse')} />
                      <span>{formatModelName(activeModel || 'openrouter/auto')}</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {activeThinking ? 'Thinking & reasoning...' : 'Responding...'}
                    </span>
                  </div>

                  {/* Live Claude-style Thinking Block */}
                  <ClaudeThinkingBlock
                    isLive={true}
                    activeThinking={activeThinking}
                    isDarkMode={isDarkMode}
                  />

                  {/* Live Streaming Word Output */}
                  {streamingText && (
                    <div className="flex flex-col gap-3 max-w-full font-sans pt-1">
                      <div className="relative">
                        <MarkdownContent
                          content={streamingText}
                          isDarkMode={isDarkMode}
                          className="text-[14px] leading-relaxed"
                        />
                        <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle rounded-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Jump to Latest Button */}
      {isUserScrolledUp && (
        <motion.button
          type="button"
          onClick={jumpToLatest}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'cursor-pointer absolute bottom-6 left-1/2 z-20 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold shadow-lg font-sans transition-colors',
            isDarkMode
              ? 'border-white/20 bg-neutral-900/95 text-neutral-200 hover:bg-neutral-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <ArrowDown className="h-3.5 w-3.5 shrink-0" />
          Jump to latest
        </motion.button>
      )}
    </main>
  );
};

export default ChatCanvas;
