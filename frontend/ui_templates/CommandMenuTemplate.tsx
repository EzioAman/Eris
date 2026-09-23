import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, X, Workflow, Layers, Settings, FileText } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
}

export interface CommandMenuTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  items?: CommandItem[];
  isDarkMode?: boolean;
  className?: string;
}

const DEFAULT_COMMANDS: CommandItem[] = [
  { id: '1', title: 'Open Workflow Builder', category: 'Workflows', shortcut: 'Ctrl+2', icon: <Workflow className="w-4 h-4" /> },
  { id: '2', title: 'Manage External Connectors', category: 'Connectors', shortcut: 'Ctrl+B', icon: <Layers className="w-4 h-4" /> },
  { id: '3', title: 'Model Configuration & Limits', category: 'Settings', shortcut: 'Ctrl+,', icon: <Settings className="w-4 h-4" /> },
  { id: '4', title: 'Inspect Workspace Files', category: 'Workspace', shortcut: 'Ctrl+Shift+F', icon: <FileText className="w-4 h-4" /> },
];

export const CommandMenuTemplate: React.FC<CommandMenuTemplateProps> = ({
  isOpen,
  onClose,
  items = DEFAULT_COMMANDS,
  isDarkMode = true,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        selected.onSelect?.();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-xs font-sans select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150',
          isDarkMode
            ? 'bg-[#0E121B] border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900',
          className
        )}
      >
        {/* Search header without logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-3.5 border-b',
          isDarkMode ? 'border-neutral-800/80' : 'border-slate-100'
        )}>
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search actions..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command list */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-center py-8 text-slate-400">
              No matching actions found
            </p>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onSelect?.();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left',
                    isSelected
                      ? isDarkMode
                        ? 'bg-blue-600/15 text-blue-300 font-medium'
                        : 'bg-blue-50 text-blue-700 font-medium'
                      : isDarkMode
                      ? 'text-neutral-300 hover:bg-white/5'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400">{item.icon || <Command className="w-4 h-4" />}</span>
                    <span>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200 dark:border-white/10 text-slate-400">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className={cn(
          'flex items-center justify-between px-4 py-2 border-t text-[11px] text-slate-400 select-none',
          isDarkMode ? 'border-neutral-800/80 bg-[#0A0D14]' : 'border-slate-100 bg-slate-50'
        )}>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-mono">Ctrl+Shift+K</span>
        </div>
      </div>
    </div>
  );
};

export default CommandMenuTemplate;
