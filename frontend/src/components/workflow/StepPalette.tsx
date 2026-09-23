import React, { useState } from 'react';
import {
  Search,
  Bot,
  FileText,
  Sparkles,
  Database,
  GitFork,
  Clock,
  Repeat,
  Zap,
  Code,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { STEP_PALETTE_ITEMS } from './defaultPipeline';
import type { StepPaletteItem } from './workflowTypes';

// Use remote SVG CDNs for connectors

export interface StepPaletteProps {
  isDarkMode: boolean;
  onSelectStepToAdd?: (step: StepPaletteItem) => void;
  className?: string;
}

const renderStepIcon = (icon: string, _color?: string) => {
  switch (icon) {
    case 'slack':
      return <img src="https://cdn.simpleicons.org/slack" alt="Slack" className="w-4 h-4 object-contain" />;
    case 'gmail':
      return <img src="https://cdn.simpleicons.org/gmail" alt="Gmail" className="w-4 h-4 object-contain" />;
    case 'notion':
      return <img src="https://cdn.simpleicons.org/notion/white" alt="Notion" className="w-4 h-4 object-contain dark:invert" />;
    case 'github':
      return <img src="https://cdn.simpleicons.org/github/white" alt="GitHub" className="w-4 h-4 object-contain dark:invert" />;
    case 'google-drive':
      return <img src="https://cdn.simpleicons.org/googledrive" alt="Google Drive" className="w-4 h-4 object-contain" />;
    case 'ai':
      return <Bot className="w-4 h-4 text-purple-400" />;
    case 'file-text':
      return <FileText className="w-4 h-4 text-purple-400" />;
    case 'sparkles':
      return <Sparkles className="w-4 h-4 text-pink-400" />;
    case 'database':
      return <Database className="w-4 h-4 text-pink-400" />;
    case 'condition':
      return <GitFork className="w-4 h-4 text-amber-400" />;
    case 'git-fork':
      return <GitFork className="w-4 h-4 text-blue-400" />;
    case 'clock':
      return <Clock className="w-4 h-4 text-violet-400" />;
    case 'repeat':
      return <Repeat className="w-4 h-4 text-emerald-400" />;
    case 'zap':
      return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'code':
      return <Code className="w-4 h-4 text-cyan-400" />;
    default:
      return <Layers className="w-4 h-4 text-neutral-400" />;
  }
};

export const StepPalette: React.FC<StepPaletteProps> = ({
  isDarkMode,
  onSelectStepToAdd,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = STEP_PALETTE_ITEMS.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const categories: Array<'AI & LLM' | 'Integrations' | 'Logic' | 'Core'> = [
    'AI & LLM',
    'Integrations',
    'Logic',
    'Core',
  ];

  return (
    <aside
      className={cn(
        'w-64 shrink-0 border-r flex flex-col font-sans select-none overflow-hidden transition-colors',
        isDarkMode
          ? 'border-white/[0.08] bg-[#0C0F17]/95 text-neutral-200'
          : 'border-slate-200 bg-white text-slate-800',
        className
      )}
    >
      {/* Search Bar */}
      <div className="p-3.5 border-b border-white/[0.06]">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors',
            isDarkMode
              ? 'bg-black/20 border-white/10 text-neutral-200 focus-within:border-white/30'
              : 'bg-slate-50 border-slate-200 text-slate-700 focus-within:border-slate-400'
          )}
        >
          <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <input
            type="text"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:opacity-50 text-xs"
          />
        </div>
      </div>

      {/* Palette List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5 no-scrollbar">
        {categories.map((cat) => {
          const items = filteredItems.filter((i) => i.category === cat);
          if (items.length === 0) return null;

          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {cat}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {items.length}
                </span>
              </div>

              <div className="space-y-1">
                {items.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onSelectStepToAdd?.(step)}
                    title={`Add ${step.name} to canvas`}
                    className={cn(
                      'cursor-pointer w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all text-left border group',
                      isDarkMode
                        ? 'border-transparent hover:border-white/10 hover:bg-white/5 text-neutral-200 hover:text-white'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    )}
                  >
                    <div
                      className={cn(
                        'size-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
                        isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-xs'
                      )}
                    >
                      {renderStepIcon(step.icon, step.color)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {step.name}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate leading-tight mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default StepPalette;
