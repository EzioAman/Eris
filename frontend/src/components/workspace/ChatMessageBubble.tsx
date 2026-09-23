import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, ExternalLink } from 'lucide-react';
import type { ChatMessage, ScheduledTaskItem, SourceItem } from './chatTypes';
import { ErisAvatar } from '../ui/ErisAvatar';
import {
  DecidedStatusPill,
  InlineApprovalCard,
  InlineFlowCard,
  ToolOutputCard,
} from './ToolCards';
import { TemplateRenderer } from './TemplateRenderer';
import { MarkdownContent } from './MarkdownContent';
import { ClaudeThinkingBlock } from './ClaudeThinkingBlock';

interface SourcesStripProps {
  sources: SourceItem[];
  isDarkMode: boolean;
}

export const SourcesStrip: React.FC<SourcesStripProps> = ({ sources, isDarkMode }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-2.5 pb-0.5">
      {sources.map((source, idx) => (
        <a
          key={idx}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.title || source.url}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border',
            isDarkMode
              ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-neutral-300 hover:text-white'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
          )}
        >
          <span className="opacity-60 text-[10px]">[{idx + 1}]</span>
          <span className="truncate max-w-[160px]">{source.domain || 'source'}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-50 shrink-0" />
        </a>
      ))}
    </div>
  );
};

export interface ChatMessageBubbleProps {
  msg: ChatMessage;
  isDarkMode: boolean;
  executingApprovalId?: string | null;
  userProfile?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  };
  onDecision: (toolId: string, approved: boolean) => void;
  onOpenFlow: (task: ScheduledTaskItem) => void;
  onSendMessage?: (msg: string) => void;
  activeModel?: string;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  msg,
  isDarkMode,
  executingApprovalId,
  userProfile,
  onDecision,
  onOpenFlow,
  onSendMessage,
  activeModel,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleFeedback = async (rating: 'up' | 'down') => {
    const next = feedback === rating ? null : rating;
    setFeedback(next);
    if (next) {
      try {
        await fetch('/api/chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: msg.id || `msg-${Date.now()}`,
            rating: next,
            prompt: '',
            response: msg.text || '',
          }),
        });
      } catch {
        // Local state already updated; gracefully degrade if backend offline
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // ─── USER MESSAGE (Untitled UI Message Layout) ───
  if (msg.role === 'user') {
    const userDisplayName = userProfile?.displayName || userProfile?.username || 'You';
    const userInitials = (userProfile?.displayName ? userProfile.displayName.slice(0, 2) : 'U').toUpperCase();
    const userAvatar = userProfile?.avatarUrl;

    return (
      <div className="flex flex-col items-end gap-1.5 group select-text font-sans">
        {/* Header with User Info */}
        <div className="flex items-center gap-2 px-1 text-xs">
          <span className={cn('font-semibold', isDarkMode ? 'text-neutral-300' : 'text-slate-700')}>
            {userDisplayName}
          </span>
          <span className={cn('text-[11px]', isDarkMode ? 'text-neutral-400' : 'text-slate-400')}>
            {msg.timestamp || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-start gap-2.5 justify-end max-w-[88%]">
          {/* User Bubble */}
          <div
            className={cn(
              'rounded-2xl rounded-tr-xs px-4 py-3 text-[14px] leading-relaxed shadow-xs border font-sans',
              isDarkMode
                ? 'bg-[#181C26] border-white/10 text-neutral-100 shadow-black/20'
                : 'bg-blue-600 border-blue-600 text-white shadow-blue-500/10'
            )}
          >
            {msg.text}
          </div>

          {/* User Avatar (Photo/GIF or Initials) */}
          <div
            className={cn(
              'size-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 shadow-xs border mt-0.5 overflow-hidden',
              isDarkMode
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-slate-200 border-slate-300 text-slate-700'
            )}
            title={userProfile?.username ? `${userDisplayName} (@${userProfile.username})` : userDisplayName}
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userDisplayName} className="h-full w-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
        </div>

        {/* Action Toolbar on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-10">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy message"
            className={cn(
              'cursor-pointer p-1 rounded-md text-[11px] flex items-center gap-1 transition-colors',
              isDarkMode
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  }

  // ─── ASSISTANT MESSAGE (Untitled UI Messaging Format) ───
  const hasThinking = Boolean(
    msg.reasoning ||
    (msg.reasoningSteps && msg.reasoningSteps.length > 0) ||
    (msg.searches && msg.searches.length > 0) ||
    (msg.switches && msg.switches.length > 0)
  );

  return (
    <div className="flex items-start gap-3 select-text font-sans group max-w-full">
      {/* Eris State-Aware Avatar */}
      <div className="relative shrink-0 mt-0.5">
        <ErisAvatar
          size="md"
          state={
            msg.tools?.some((t) => t.kind === 'approval' && t.decision === 'pending')
              ? 'alert'
              : msg.tools && msg.tools.length > 0
                ? 'working'
                : msg.text.includes('Encountered an issue')
                  ? 'error'
                  : 'success'
          }
        />
      </div>

      {/* Message Body Container */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Author / Status Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
            ERIS
          </span>

          {/* Active Model Pill */}
          <span
            className={cn(
              'text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1.5',
              isDarkMode
                ? 'border-white/10 bg-white/5 text-neutral-300'
                : 'border-slate-200 bg-slate-100 text-slate-700'
            )}
            title="Active Model"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              {(msg.activeModel || activeModel || 'None Selected')
                .replace(/^gemini\/|^openrouter\/|^nvidia_nim\/|^openai\/|^groq\/|^anthropic\/|^deepseek\/|^ollama\//, '')}
            </span>
          </span>

          <span className={cn('text-[11px]', isDarkMode ? 'text-neutral-400' : 'text-slate-400')}>
            {msg.timestamp || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>

        {/* Message Content Box */}
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm px-4 py-3.5 text-[14px] leading-relaxed transition-all border shadow-xs',
            isDarkMode
              ? 'bg-[#121622]/90 border-white/[0.08] text-neutral-100 shadow-black/10'
              : 'bg-white border-slate-200/80 text-slate-800 shadow-slate-200/40'
          )}
        >
          {/* Claude-style Thinking Block */}
          {hasThinking && (
            <ClaudeThinkingBlock
              reasoningSteps={msg.reasoningSteps}
              reasoning={msg.reasoning}
              searches={msg.searches}
              switches={msg.switches}
              durationSeconds={msg.thoughtDuration}
              isDarkMode={isDarkMode}
              defaultExpanded={false}
            />
          )}

          {/* Assistant Text Response */}
          {msg.text && (
            <MarkdownContent
              content={msg.text}
              isDarkMode={isDarkMode}
              className="text-[14px] leading-relaxed"
            />
          )}

          {/* Sources Strip */}
          {msg.sources && msg.sources.length > 0 && (
            <SourcesStrip sources={msg.sources} isDarkMode={isDarkMode} />
          )}

          {/* Render Tools & Workflows */}
          {(msg.tools ?? []).map((tool, tIdx) => {
            if (tool.kind === 'flow') {
              return (
                <InlineFlowCard
                  key={tool.id || tIdx}
                  task={tool.task}
                  onOpenFlow={onOpenFlow}
                  isDarkMode={isDarkMode}
                />
              );
            }
            if (tool.kind === 'output') {
              return (
                <ToolOutputCard
                  key={tool.id || tIdx}
                  tool={tool}
                  isDarkMode={isDarkMode}
                />
              );
            }
            if (tool.kind === 'approval') {
              const actionTitle = tool.action || (tool.tool === 'send_email' ? 'Send email' : tool.tool ? `Run ${tool.tool}` : 'Execute action');
              if (tool.decision === 'approved') {
                return (
                  <DecidedStatusPill
                    key={tool.id || tIdx}
                    actionTitle={actionTitle}
                    result={tool.result || 'Approved'}
                    isDarkMode={isDarkMode}
                  />
                );
              }
              if (tool.decision === 'denied') {
                return (
                  <DecidedStatusPill
                    key={tool.id || tIdx}
                    actionTitle={actionTitle}
                    denied={true}
                    result={tool.result || 'Skipped, not approved'}
                    isDarkMode={isDarkMode}
                  />
                );
              }
              return (
                <InlineApprovalCard
                  key={tool.id || tIdx}
                  tool={tool}
                  isExecuting={executingApprovalId === tool.id}
                  isDarkMode={isDarkMode}
                  onDecision={(approved) => onDecision(tool.id, approved)}
                />
              );
            }
            return null;
          })}

          {/* Render Attached Template (Safari browser preview, etc.) */}
          {msg.templateType && msg.templateData && (
            <TemplateRenderer
              type={msg.templateType}
              data={msg.templateData}
              isDarkMode={isDarkMode}
              onSendMessage={onSendMessage}
            />
          )}
        </div>

        {/* Untitled UI Message Action Footer (Copy, Regenerate, Thumbs Feedback) */}
        <div className="flex items-center gap-1.5 pt-0.5 px-1">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard' : 'Copy message'}
            className={cn(
              'cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border shadow-xs',
              copied
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : isDarkMode
                  ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onSendMessage && (
            <button
              type="button"
              onClick={() => onSendMessage('Please regenerate your response.')}
              title="Regenerate response"
              className={cn(
                'cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border shadow-xs',
                isDarkMode
                  ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
              )}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleFeedback('up')}
              title="Helpful response"
              className={cn(
                'cursor-pointer p-1.5 rounded-md transition-colors border shadow-xs',
                feedback === 'up'
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                  : isDarkMode
                    ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              )}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('down')}
              title="Needs improvement"
              className={cn(
                'cursor-pointer p-1.5 rounded-md transition-colors border shadow-xs',
                feedback === 'down'
                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                  : isDarkMode
                    ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              )}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
