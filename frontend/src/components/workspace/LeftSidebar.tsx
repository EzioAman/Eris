import React, { useEffect } from 'react';
import {
  MessageSquare,
  Layers,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Cpu,
  Workflow,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AnimatedList, AnimatedListItem } from '../magicui/animated-list';

export interface LeftSidebarProps {
  isDarkMode: boolean;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  showWorkspaceTree: boolean;
  onToggleWorkspaceTree: () => void;
  showRightSidebar: boolean;
  rightSidebarTab: 'connectors' | 'plugins' | 'tools';
  onToggleConnectors: () => void;
  onToggleTools: () => void;
  onOpenModelMatrix?: () => void;
  onOpenWorkflowPage?: () => void;
  chatHistory?: { id: string; title: string; timestamp: string }[];
  activeChatId?: string | null;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
  onScrollToLatest?: () => void;
  onDeleteChat?: (chatId: string, clearMemoryOnly?: boolean) => void;
  width?: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isDarkMode,
  isSidebarExpanded,
  setIsSidebarExpanded,
  showWorkspaceTree,
  onToggleWorkspaceTree,
  showRightSidebar,
  rightSidebarTab,
  onToggleConnectors,
  onToggleTools,
  onOpenModelMatrix,
  onOpenWorkflowPage,
  chatHistory,
  activeChatId,
  onSelectChat,
  onNewChat,
  onScrollToLatest,
  onDeleteChat,
  width,
}) => {
  const isConnectorsActive = showRightSidebar && (rightSidebarTab === 'connectors' || rightSidebarTab === 'plugins');
  const isToolsActive = showRightSidebar && rightSidebarTab === 'tools';

  // Listen for global context menu delete action
  useEffect(() => {
    const handleDelete = (e: Event) => {
      const custom = e as CustomEvent<{ chatId: string; hardDelete?: boolean }>;
      if (custom.detail?.chatId) {
        onDeleteChat?.(custom.detail.chatId, custom.detail.hardDelete ?? false);
      }
    };
    window.addEventListener('eris:delete-chat', handleDelete);
    return () => window.removeEventListener('eris:delete-chat', handleDelete);
  }, [onDeleteChat]);

  const navItems = [
    {
      id: 'chat',
      label: 'Agent Chat',
      icon: MessageSquare,
      isActive: true,
      onClick: () => {
        onScrollToLatest?.();
      },
    },
    {
      id: 'workflows',
      label: 'Workflow Studio (in-development)',
      icon: Workflow,
      isActive: false,
      onClick: onOpenWorkflowPage,
    },
    {
      id: 'models',
      label: 'Choose Model',
      icon: Cpu,
      isActive: false,
      onClick: onOpenModelMatrix,
    },
    {
      id: 'plugins',
      label: 'Plugins',
      icon: Layers,
      isActive: isConnectorsActive,
      onClick: onToggleConnectors,
    },
    {
      id: 'tools',
      label: 'Tools & Sandbox',
      icon: ShieldCheck,
      isActive: isToolsActive,
      onClick: onToggleTools,
    },
    {
      id: 'workspace',
      label: 'Workspace Files',
      icon: Folder,
      isActive: showWorkspaceTree,
      onClick: onToggleWorkspaceTree,
      badge: showWorkspaceTree ? 'open' : undefined,
    },
  ];

  return (
    <aside
      style={isSidebarExpanded && width ? { width } : undefined}
      className={cn(
        'shrink-0 border-r flex flex-col py-3 z-10 transition-all duration-150 select-none font-sans',
        isSidebarExpanded ? (width ? '' : 'w-56 px-3') : 'w-12 px-1 items-center',
        'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
      )}
    >
      {/* Top Primary Navigation */}
      <div className={cn('flex flex-col gap-1 w-full', isSidebarExpanded ? 'px-2' : 'px-0 items-center')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              title={item.label}
              className={cn(
                'rounded-xl flex items-center transition-all cursor-pointer text-xs font-medium',
                isSidebarExpanded ? 'w-full gap-3 px-3 py-2 text-left' : 'size-9 justify-center mx-auto',
                item.isActive
                  ? isDarkMode
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold shadow-xs'
                    : 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', item.isActive && (isDarkMode ? 'text-blue-400' : 'text-blue-600'))} />
              {isSidebarExpanded && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded',
                        isDarkMode ? 'bg-white/10 text-neutral-300' : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Middle Content (Expanded Mode) */}
      {isSidebarExpanded && (
        <div className="flex-1 mt-5 flex flex-col min-h-0 w-full overflow-hidden border-t pt-3.5 border-slate-300 dark:border-white/15 px-2">
          {/* Recent Chats Section */}
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <div className="px-1 flex items-center justify-between mb-2">
              <span
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider',
                  isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                )}
              >
                Conversations
              </span>
              {onNewChat && (
                <button
                  type="button"
                  onClick={onNewChat}
                  title="New Chat (Ctrl+N)"
                  className={cn(
                    'p-1 rounded cursor-pointer transition-colors',
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-slate-200 text-slate-600'
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-0.5">
              {chatHistory && chatHistory.length > 0 ? (
                <AnimatedList delay={50} className="space-y-1">
                  {chatHistory.map((chat) => (
                    <AnimatedListItem key={chat.id}>
                      <button
                        type="button"
                        data-chat-item={chat.id}
                        data-chat-title={chat.title}
                        onClick={() => onSelectChat?.(chat.id)}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors outline-none select-none',
                          activeChatId === chat.id
                            ? isDarkMode
                              ? 'bg-white/10 text-white font-medium shadow-xs'
                              : 'bg-blue-50 text-blue-700 font-medium shadow-xs border border-blue-200'
                            : isDarkMode
                            ? 'text-neutral-300 hover:bg-white/5 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-medium truncate leading-tight">{chat.title}</span>
                        </div>
                        <div className={cn('text-[11px] font-mono pl-5', isDarkMode ? 'text-neutral-400' : 'text-slate-400')}>
                          {chat.timestamp}
                        </div>
                      </button>
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              ) : (
                <div className="text-xs text-neutral-400 py-3 text-center">No recent chats</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtle Sidebar Collapse Button */}
      <div
        className={cn(
          'mt-auto flex flex-col items-center gap-2 w-full pt-3 border-t',
          isSidebarExpanded ? 'px-2' : 'px-0',
          isDarkMode ? 'border-white/15' : 'border-slate-300'
        )}
      >
        <button
          type="button"
          onClick={() => setIsSidebarExpanded((prev) => !prev)}
          title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          className={cn(
            'rounded-xl flex items-center transition-colors cursor-pointer',
            isSidebarExpanded ? 'w-full gap-3 px-3 py-2 text-left' : 'size-9 justify-center mx-auto',
            isDarkMode
              ? 'text-neutral-400 hover:text-white hover:bg-white/10'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          )}
        >
          {isSidebarExpanded ? (
            <PanelLeftClose className="w-4 h-4 shrink-0" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 shrink-0" />
          )}
          {isSidebarExpanded && (
            <span className="text-xs font-medium truncate">Collapse sidebar</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default LeftSidebar;
