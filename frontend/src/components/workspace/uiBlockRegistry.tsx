// uiBlockRegistry.tsx
//
// Dynamic UI Block Registry and Dispatcher for ERIS.
// Reuses the established, battle-tested templates via TemplateRenderer
// (code-comparison, terminal, file-tree, media-player, safari-preview,
// subagent-chain, ios-preview, android-preview).
// Supports additive progressive rendering with 'building' status skeletons.

import React from 'react';
import { cn } from '../../lib/utils';
import { TemplateRenderer } from './TemplateRenderer';
import type { UIBlock } from './chatTypes';

export type { UIBlock };

export const UIBlockDispatcher: React.FC<{
  block: UIBlock;
  isDarkMode: boolean;
  onSendMessage?: (msg: string) => void;
}> = ({ block, isDarkMode, onSendMessage }) => {
  if (block.status === 'building') {
    return <UIBlockSkeleton isDarkMode={isDarkMode} label={block.component} />;
  }

  return (
    <TemplateRenderer
      type={block.component}
      data={block.props}
      isDarkMode={isDarkMode}
      onSendMessage={onSendMessage}
    />
  );
};

export const UIBlockList: React.FC<{
  blocks?: UIBlock[];
  isDarkMode: boolean;
  onSendMessage?: (msg: string) => void;
}> = ({ blocks, isDarkMode, onSendMessage }) => {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="space-y-2.5 mt-2 w-full">
      {blocks.map((block) => (
        <UIBlockDispatcher
          key={block.id}
          block={block}
          isDarkMode={isDarkMode}
          onSendMessage={onSendMessage}
        />
      ))}
    </div>
  );
};

const UIBlockSkeleton: React.FC<{ isDarkMode: boolean; label: string }> = ({ isDarkMode, label }) => (
  <div
    className={cn(
      'animate-pulse rounded-2xl border p-4 h-36 flex flex-col items-center justify-center gap-2 text-xs font-mono select-none my-2 transition-all',
      isDarkMode
        ? 'border-white/10 bg-white/[0.02] text-neutral-400'
        : 'border-slate-200 bg-slate-50 text-slate-500'
    )}
  >
    <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    <span>Building {label} preview…</span>
  </div>
);

export default UIBlockList;
