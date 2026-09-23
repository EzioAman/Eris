import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Plug,
  Wrench,
  Cpu,
  Workflow,
  ArrowRight,
  ShieldCheck,
  Terminal,
  FileCode,
  Moon,
  Sun,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PluginItem } from './PluginConfigModal';

export interface CommandPaletteItem {
  id: string;
  name: string;
  description: string;
  category: 'Plugins' | 'Tools' | 'Models' | 'Settings & Actions';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  plugins?: PluginItem[];
  tools?: any[];
  activeModel?: string;
  executionMode?: 'speed' | 'accuracy';
  onSelectModel?: (modelId: string) => void;
  onToggleExecutionMode?: () => void;
  onToggleTheme?: () => void;
  onClearChat?: () => void;
  onOpenWorkflowStudio?: () => void;
  onOpenSystemHealth?: () => void;
  onConfigurePlugin?: (plugin: PluginItem) => void;
  onSelectTab?: (tab: 'plugins' | 'tools' | 'connectors') => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  plugins = [],
  tools: propTools = [],
  activeModel = 'gemini/gemini-flash-lite-latest',
  executionMode = 'speed',
  onSelectModel,
  onToggleExecutionMode,
  onToggleTheme,
  onClearChat,
  onOpenWorkflowStudio,
  onOpenSystemHealth,
  onConfigurePlugin,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [dynamicTools, setDynamicTools] = useState<any[]>([]);

  const hasFetchedToolsRef = useRef(false);

  useEffect(() => {
    if (propTools && propTools.length > 0) {
      setDynamicTools(propTools);
      return;
    }

    if (isOpen && !hasFetchedToolsRef.current) {
      hasFetchedToolsRef.current = true;
      fetch('/api/tools')
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && Array.isArray(d.tools)) {
            setDynamicTools(d.tools);
          }
        })
        .catch(() => { });
    }
  }, [isOpen, propTools?.length]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener handled in parent, Escape to close handled here
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build items catalog
  const allItems: CommandPaletteItem[] = useMemo(() => {
    const items: CommandPaletteItem[] = [];

    // 1. Plugins
    plugins.forEach((p) => {
      items.push({
        id: `plugin-${p.id}`,
        name: p.name,
        description: `${p.usage} (${p.tools?.length || 0} tools)`,
        category: 'Plugins',
        icon: <Plug className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onSelectTab?.('plugins');
          if (p.dependency && !p.is_configured) {
            onConfigurePlugin?.(p);
          }
          onClose();
        },
        keywords: ['plugin', 'connector', p.name.toLowerCase(), p.id],
      });
    });

    // 2. Real Scanned & Builtin Tools
    dynamicTools.forEach((t) => {
      const isDangerous = t.severity === 'DANGEROUS';
      const isMutating = t.severity === 'MUTATING';
      items.push({
        id: `tool-${t.id || t.name}`,
        name: t.name,
        description: `${t.description || 'Verified Tool'} [${t.severity || 'SAFE'}]`,
        category: 'Tools',
        icon: isDangerous ? (
          <Terminal className="w-4 h-4 text-rose-400" />
        ) : isMutating ? (
          <FileCode className="w-4 h-4 text-cyan-400" />
        ) : (
          <Wrench className="w-4 h-4 text-emerald-400" />
        ),
        action: () => {
          onSelectTab?.('tools');
          onClose();
        },
        keywords: ['tool', 'function', t.name.toLowerCase(), t.filename || '', t.severity?.toLowerCase() || ''],
      });
    });

    // 3. Models
    const modelCandidates = [
      { id: 'gemini/gemini-flash-lite-latest', name: 'Gemini Flash Lite (Active Quota)', provider: 'Google AI' },
      { id: 'gemini/gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', provider: 'Google AI' },
      { id: 'gemini/gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'Google AI' },
      { id: 'openrouter/deepseek/deepseek-v4-flash-0731:free', name: 'DeepSeek V4 Flash (Free)', provider: 'OpenRouter' },
      { id: 'openrouter/qwen/qwen3.8-27b:free', name: 'Qwen 3.8 27B (Free)', provider: 'OpenRouter' },
      { id: 'openrouter/liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5 (Free)', provider: 'OpenRouter' },
    ];
    modelCandidates.forEach((m) => {
      const isCurrent = activeModel === m.id;
      items.push({
        id: `model-${m.id}`,
        name: m.name,
        description: `${m.provider} │ ${isCurrent ? 'Active Model' : 'Switch Model'}`,
        category: 'Models',
        icon: <Cpu className={cn('w-4 h-4', isCurrent ? 'text-emerald-400' : 'text-purple-400')} />,
        action: () => {
          onSelectModel?.(m.id);
          onClose();
        },
        keywords: ['model', 'llm', m.name.toLowerCase(), m.provider.toLowerCase()],
      });
    });

    // 4. Settings & Quick Actions

    items.push({
      id: 'action-toggle-theme',
      name: `Switch to ${isDarkMode ? 'Light Mode' : 'Dark Mode'}`,
      description: 'Toggle application visual appearance',
      category: 'Settings & Actions',
      icon: isDarkMode ? <Sun className="w-4 h-4 text-sky-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onToggleTheme?.();
        onClose();
      },
      keywords: ['theme', 'dark', 'light', 'appearance'],
    });

    items.push({
      id: 'action-workflow-studio',
      name: 'Open Workflow Studio (in-development)',
      description: 'Card-based pipeline builder with Min-Max execution branching',
      category: 'Settings & Actions',
      icon: <Workflow className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onOpenWorkflowStudio?.();
        onClose();
      },
      keywords: ['workflow', 'pipeline', 'dag', 'studio', 'cards'],
    });

    items.push({
      id: 'action-system-health',
      name: 'System Health & Security Audit',
      description: 'Check active daemon, Win32 sandbox, and model gateway status',
      category: 'Settings & Actions',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onOpenSystemHealth?.();
        onClose();
      },
      keywords: ['health', 'audit', 'security', 'status', 'diagnostics'],
    });

    items.push({
      id: 'action-clear-chat',
      name: 'Clear Chat History',
      description: 'Reset current session messages and scratch memory',
      category: 'Settings & Actions',
      icon: <Trash2 className="w-4 h-4 text-red-400" />,
      action: () => {
        onClearChat?.();
        onClose();
      },
      keywords: ['clear', 'reset', 'delete', 'clean'],
    });

    return items;
  }, [
    plugins,
    activeModel,
    executionMode,
    isDarkMode,
    onSelectModel,
    onToggleExecutionMode,
    onToggleTheme,
    onClearChat,
    onOpenWorkflowStudio,
    onOpenSystemHealth,
    onConfigurePlugin,
    onSelectTab,
    onClose,
  ]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
    );
  }, [allItems, query]);

  // Handle arrow navigation & enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'relative w-full max-w-2xl rounded-2xl border flex flex-col overflow-hidden z-10 font-sans dashboard-modal-glow',
            isDarkMode
              ? 'bg-[#0D111A]/95 border-violet-500/30 text-white backdrop-blur-xl'
              : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-300 backdrop-blur-xl'
          )}
        >
          {/* Top Search Input */}
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 border-b',
              isDarkMode ? 'border-white/10' : 'border-slate-200'
            )}
          >
            <Search className="w-5 h-5 text-neutral-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search plugins, tools, models, settings, actions... (↑↓ to navigate)"
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-neutral-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-neutral-400 hover:text-white p-1 rounded"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-96 overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                No commands, plugins, or models matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer',
                      isSelected
                        ? isDarkMode
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100 text-slate-900'
                        : isDarkMode
                        ? 'text-neutral-300 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'size-8 rounded-lg flex items-center justify-center shrink-0 border',
                          isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                        )}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs truncate">{item.name}</span>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.2 rounded font-mono',
                              isDarkMode ? 'bg-white/10 text-neutral-400' : 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Help Footer */}
          <div
            className={cn(
              'px-4 py-2 border-t flex items-center justify-between text-[11px] text-neutral-400 font-mono',
              isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
            )}
          >
            <div className="flex items-center gap-3">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>esc to exit</span>
            </div>
            <span>{filteredItems.length} available items</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPaletteModal;
