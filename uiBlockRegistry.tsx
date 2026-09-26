// uiBlockRegistry.tsx
//
// Replaces the regex-based "guess what to render from the user's text"
// cascade in ChatWorkspace.handleSendMessage with an explicit contract:
// the agent DECLARES what UI to show (via a `render_ui` tool call, surfaced
// over SSE as a `ui_intent` event), and the frontend just renders it.
//
// Adding a new dynamic UI type going forward = one line in UI_COMPONENT_REGISTRY.
// No new regex, no new heuristic, no risk of it firing on the wrong message.

import React from 'react';
import { cn } from '../../lib/utils';
import { CodeComparisonView } from '../templates/CodeComparisonView';
import { TerminalView } from '../templates/TerminalView';
import { FileTreeView } from '../templates/FileTreeView';
import { MediaPlayerView } from '../templates/MediaPlayerView';
import { SafariPreviewView } from '../templates/SafariPreviewView';
import { SubagentChainView } from '../templates/SubagentChainView';
import { IosPreviewView } from '../templates/IosPreviewView';
import { AndroidPreviewView } from '../templates/AndroidPreviewView';

// ─── Types ───

export interface UIBlock {
  id: string;
  component: string; // 'code-comparison' | 'terminal' | 'file-tree' | ...
  props: Record<string, any>;
  status?: 'building' | 'ready'; // 'building' while props are still streaming in
  /**
   * Optional: where this block sits relative to the message's prose.
   * If present, ChatMessageBubble can splice blocks in between paragraphs
   * instead of always appending them after all text (true Claude-style
   * interleaving). Omit if you're not ready to do interleaving yet —
   * blocks just render after the text, in array order.
   */
  afterTextOffset?: number;
}

type UIComponentRenderer = React.FC<{
  props: Record<string, any>;
  isDarkMode: boolean;
  status?: 'building' | 'ready';
}>;

// ─── Registry ───
// Single source of truth for "component name the agent can request" -> "what renders".
// Keep component names stable — they're a contract with the backend/agent prompt.

const UI_COMPONENT_REGISTRY: Record<string, UIComponentRenderer> = {
  'code-comparison': ({ props, isDarkMode }) => <CodeComparisonView {...props} isDarkMode={isDarkMode} />,
  'terminal': ({ props, isDarkMode }) => <TerminalView {...props} isDarkMode={isDarkMode} />,
  'file-tree': ({ props, isDarkMode }) => <FileTreeView {...props} isDarkMode={isDarkMode} />,
  'media-player': ({ props, isDarkMode }) => <MediaPlayerView {...props} isDarkMode={isDarkMode} />,
  'safari-preview': ({ props, isDarkMode }) => <SafariPreviewView {...props} isDarkMode={isDarkMode} />,
  'subagent-chain': ({ props, isDarkMode }) => <SubagentChainView {...props} isDarkMode={isDarkMode} />,
  'ios-preview': ({ props, isDarkMode }) => <IosPreviewView {...props} isDarkMode={isDarkMode} />,
  'android-preview': ({ props, isDarkMode }) => <AndroidPreviewView {...props} isDarkMode={isDarkMode} />,
};

// ─── Dispatcher ───

export const UIBlockDispatcher: React.FC<{
  block: UIBlock;
  isDarkMode: boolean;
}> = ({ block, isDarkMode }) => {
  const Renderer = UI_COMPONENT_REGISTRY[block.component];

  if (!Renderer) {
    // Fail soft: an older frontend build talking to a newer agent (or vice versa)
    // should never crash the message — just skip the block visibly.
    return (
      <div
        className={cn(
          'text-[11px] italic px-2.5 py-1.5 rounded-lg border',
          isDarkMode
            ? 'text-neutral-500 border-white/5 bg-white/[0.02]'
            : 'text-slate-400 border-slate-200 bg-slate-50'
        )}
      >
        Unsupported UI block: <code>{block.component}</code>
      </div>
    );
  }

  if (block.status === 'building') {
    return <UIBlockSkeleton isDarkMode={isDarkMode} label={block.component} />;
  }

  return <Renderer props={block.props} isDarkMode={isDarkMode} status={block.status} />;
};

// Renders a list of blocks in order. Use this in ChatMessageBubble in place
// of the single `msg.templateType && <TemplateRenderer .../>` check.
export const UIBlockList: React.FC<{ blocks?: UIBlock[]; isDarkMode: boolean }> = ({ blocks, isDarkMode }) => {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="space-y-2.5 mt-2">
      {blocks.map((block) => (
        <UIBlockDispatcher key={block.id} block={block} isDarkMode={isDarkMode} />
      ))}
    </div>
  );
};

const UIBlockSkeleton: React.FC<{ isDarkMode: boolean; label: string }> = ({ isDarkMode, label }) => (
  <div
    className={cn(
      'animate-pulse rounded-xl border h-40 flex items-center justify-center text-[11px]',
      isDarkMode
        ? 'border-white/10 bg-white/[0.03] text-neutral-500'
        : 'border-slate-200 bg-slate-50 text-slate-400'
    )}
  >
    Building {label}…
  </div>
);
