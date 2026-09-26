import React, { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Terminal as TerminalIcon, Lightbulb, Workflow, Globe, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatModelName } from '../../lib/modelUtils';
import type { ChatMessage, ScheduledTaskItem, ActiveThinkingState } from './chatTypes';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MarkdownContent } from './MarkdownContent';
import { ClaudeThinkingBlock } from './ClaudeThinkingBlock';
import { ErisAvatar } from '../ui/ErisAvatar';
import { useSmartScroll } from './useSmartScroll';

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
  chatZoom?: number;
  onZoomChange?: (newZoom: number) => void;
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
  chatZoom = 100,
  onZoomChange,
}) => {
  const {
    containerRef: scrollContainerRef,
    following,
    unseen,
    scrollToBottom,
    notifyStreamProgress,
    notifyNewMessage,
  } = useSmartScroll();

  // Detect wheel movement: Ctrl/Cmd + Wheel adjusts zoom level directly
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 5 : -5;
      const next = Math.max(80, Math.min(150, chatZoom + delta));
      onZoomChange?.(next);
      return;
    }
  }, [chatZoom, onZoomChange]);

  // Stable ref callback: avoids detaching/reattaching the scroll listener on
  // every render (this component re-renders on every streamed token).
  const setScrollRefs = useCallback((el: HTMLDivElement | null) => {
    (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (scrollRef && 'current' in scrollRef) {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  }, [scrollContainerRef, scrollRef]);

  // Streaming text changes (per-token) only ever auto-scroll while following;
  // they never touch the unseen counter — it's still the same in-flight message.
  useEffect(() => {
    if (isStreaming) notifyStreamProgress();
  }, [streamingText, isStreaming, notifyStreamProgress]);

  // A fully-appended message (in `messages`, not the live stream) is what
  // actually counts as "new" for the unseen badge and for snap-to-bottom.
  const prevMessagesLength = useRef(messages.length);
  const prevLastMessageId = useRef<string | undefined>(messages[messages.length - 1]?.id);

  useEffect(() => {
    const delta = messages.length - prevMessagesLength.current;
    const lastMsg = messages[messages.length - 1];
    const lastIdChanged = lastMsg?.id !== prevLastMessageId.current;

    if (delta > 0 && lastIdChanged) {
      notifyNewMessage(delta);
      // Snap to bottom on the user's own send, regardless of current scroll position.
      if (lastMsg?.role === 'user') {
        scrollToBottom('smooth');
      }
    }

    prevMessagesLength.current = messages.length;
    prevLastMessageId.current = lastMsg?.id;
  }, [messages, notifyNewMessage, scrollToBottom]);

  return (
    <main
      className={cn(
        'flex-1 flex flex-col relative overflow-hidden transition-colors w-full h-full',
        'bg-transparent text-[var(--text-primary)]'
      )}
    >

      {/* Scrollable Conversation Container */}
      <div
        ref={setScrollRefs}
        onWheel={handleWheel}
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
                {onOpenModelConfig && (
                  <button
                    type="button"
                    onClick={() => onOpenModelConfig()}
                    className={cn(
                      'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all shadow-xs font-medium',
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-800'
                    )}
                  >
                    <Settings2 className="w-4 h-4 text-neutral-400" />
                    Model Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="max-w-3xl mx-auto w-full flex flex-col gap-6 origin-top transition-transform"
            style={{ transform: `scale(${chatZoom / 100})`, transformOrigin: 'top center' }}
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
                      {/* Static dot + separate ping layer: animate-ping alone fades the
                          only dot to 0 opacity each cycle, reading as a blink rather
                          than a steady pulse. */}
                      <span className="relative flex size-1.5 shrink-0">
                        <span
                          className={cn(
                            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                            activeThinking ? 'bg-amber-400' : 'bg-blue-400'
                          )}
                        />
                        <span
                          className={cn(
                            'relative inline-flex size-1.5 rounded-full',
                            activeThinking ? 'bg-amber-400' : 'bg-blue-400'
                          )}
                        />
                      </span>
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
      {!following && (
        <motion.button
          type="button"
          onClick={() => scrollToBottom('smooth')}
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
          <span>Jump to latest</span>
          {unseen > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-white leading-tight">
              {unseen}
            </span>
          )}
        </motion.button>
      )}
    </main>
  );
};

export default ChatCanvas;