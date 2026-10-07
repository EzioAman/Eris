import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Plug,
  Puzzle,
  GitCompareArrows,
  Workflow,
  Cpu,
  Search,
  Trash2,
  MoreHorizontal,
  Edit3,
  Eraser,
  Check,
  X,
  Settings,
  SlidersHorizontal,
  User,
  ChevronsUpDown,
  BookOpen,
  LogOut,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UserProfileInfo {
  displayName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
}

export interface LeftSidebarProps {
  isDarkMode: boolean;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  showWorkspaceTree: boolean;
  onToggleWorkspaceTree: () => void;
  showRightSidebar: boolean;
  rightSidebarTab: 'connectors' | 'plugins' | 'tools';
  onToggleConnectors: () => void;
  onTogglePlugins?: () => void;
  onToggleTools: () => void;
  onOpenModelMatrix?: () => void;
  onOpenWorkflowPage?: () => void;
  onOpenSettings?: () => void;
  chatHistory?: { id: string; title: string; timestamp: string }[];
  activeChatId?: string | null;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
  onScrollToLatest?: () => void;
  onDeleteChat?: (chatId: string, clearMemoryOnly?: boolean) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
  width?: number;
  userProfile?: UserProfileInfo;
  onSignOut?: () => void;
  onAddAccount?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  chatId: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick?: () => void;
}

const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <span
    role="tooltip"
    className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
  >
    {label}
  </span>
);

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isDarkMode,
  isSidebarExpanded,
  setIsSidebarExpanded,
  showWorkspaceTree,
  onToggleWorkspaceTree,
  showRightSidebar,
  rightSidebarTab,
  onToggleConnectors,
  onTogglePlugins,
  onToggleTools: _onToggleTools,
  onOpenModelMatrix,
  onOpenWorkflowPage,
  onOpenSettings,
  chatHistory = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  width,
  userProfile,
  onSignOut,
  onAddAccount,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isMcpActive = showRightSidebar && rightSidebarTab === 'connectors';
  const isPluginsActive = showRightSidebar && rightSidebarTab === 'plugins';

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      setContextMenu(null);
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setEditingChatId(null);
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const handleStartRename = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    setContextMenu(null);
  };

  const handleCommitRename = (chatId: string) => {
    const clean = editingTitle.trim();
    if (clean) onRenameChat?.(chatId, clean);
    setEditingChatId(null);
  };

  const footerNav: NavItem[] = [
    { id: 'mcp', label: 'MCP servers', icon: Plug, isActive: isMcpActive, onClick: onToggleConnectors },
    {
      id: 'plugins',
      label: 'Plugins & Skills',
      icon: Puzzle,
      isActive: isPluginsActive,
      onClick: onTogglePlugins ?? onToggleConnectors,
    },
    { id: 'workflows', label: 'Workflow Studio', icon: Workflow, isActive: false, onClick: onOpenWorkflowPage },
    {
      id: 'workspace',
      label: 'Workspace changes',
      icon: GitCompareArrows,
      isActive: showWorkspaceTree,
      onClick: onToggleWorkspaceTree,
    },
    { id: 'models', label: 'Models', icon: Cpu, isActive: false, onClick: onOpenModelMatrix },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal, isActive: false, onClick: onOpenSettings },
  ];

  const filteredHistory = useMemo(() => {
    if (!searchFilter.trim()) return chatHistory;
    const query = searchFilter.toLowerCase();
    return chatHistory.filter((c) => c.title.toLowerCase().includes(query));
  }, [chatHistory, searchFilter]);

  const itemBase =
    'relative flex items-center rounded-lg text-[13px] font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]';
  const itemIdle = isDarkMode
    ? 'text-neutral-400 hover:bg-white/[0.06] hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const itemActive = isDarkMode ? 'bg-white/[0.08] text-white' : 'bg-slate-200/70 text-slate-900';
  const mutedText = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <li key={item.id} className="group relative flex justify-center">
        <button
          type="button"
          onClick={item.onClick}
          aria-pressed={item.isActive}
          aria-label={isSidebarExpanded ? undefined : item.label}
          className={cn(
            itemBase,
            isSidebarExpanded ? 'h-9 w-full gap-3 px-2.5' : 'size-9 justify-center',
            item.isActive ? itemActive : itemIdle
          )}
        >
          <Icon className="size-4 shrink-0" />
          {isSidebarExpanded && <span className="truncate">{item.label}</span>}
        </button>
        {!isSidebarExpanded && <Tooltip label={item.label} />}
      </li>
    );
  };

  const initial = (userProfile?.displayName || userProfile?.email || 'U').charAt(0).toUpperCase();

  return (
    <aside
      aria-label="Sidebar"
      style={isSidebarExpanded && width ? { width } : undefined}
      className={cn(
        'relative z-10 flex shrink-0 select-none flex-col border-r font-sans transition-[width] duration-200',
        isSidebarExpanded ? (width ? 'px-3 py-3' : 'w-72 px-3 py-3') : 'w-14 items-center px-2 py-3',
        'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
      )}
    >
      {/* Brand header */}
      <div className={cn('flex items-center', isSidebarExpanded ? 'justify-between px-1' : 'flex-col gap-2')}>
        {isSidebarExpanded && (
          <span className="text-base font-semibold tracking-tight">Eris</span>
        )}
        <div className="group relative">
          <button
            type="button"
            onClick={() => setIsSidebarExpanded((prev) => !prev)}
            aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isSidebarExpanded}
            className={cn(itemBase, 'size-8 justify-center', itemIdle)}
          >
            {isSidebarExpanded ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
          {!isSidebarExpanded && <Tooltip label="Expand sidebar" />}
        </div>
      </div>

      {/* New chat */}
      {onNewChat && (
        <div className={cn('group relative mt-4', isSidebarExpanded ? 'w-full' : '')}>
          <button
            type="button"
            onClick={onNewChat}
            aria-label={isSidebarExpanded ? undefined : 'New chat'}
            title="New chat (Ctrl+N)"
            className={cn(
              itemBase,
              isSidebarExpanded ? 'h-10 w-full gap-2.5 px-3' : 'size-9 justify-center',
              isDarkMode
                ? 'border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]'
                : 'border border-slate-200 bg-white text-slate-900 shadow-xs hover:bg-slate-50'
            )}
          >
            <Plus className="size-4 shrink-0" />
            {isSidebarExpanded && (
              <>
                <span className="flex-1 text-left">New Chat</span>
                <kbd className={cn('font-mono text-[10px]', mutedText)}>Ctrl N</kbd>
              </>
            )}
          </button>
          {!isSidebarExpanded && <Tooltip label="New chat" />}
        </div>
      )}

      {/* Recents */}
      {isSidebarExpanded ? (
        <section aria-labelledby="recents-heading" className="mt-5 flex min-h-0 flex-1 flex-col">
          {chatHistory.length > 0 && (
            <div className="relative mb-3">
              <Search
                aria-hidden="true"
                className={cn('pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2', mutedText)}
              />
              <label htmlFor="sidebar-chat-search" className="sr-only">
                Search chats
              </label>
              <input
                id="sidebar-chat-search"
                type="search"
                placeholder="Search chats"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={cn(
                  'h-8 w-full rounded-lg border bg-transparent pl-8 pr-2.5 text-xs outline-none transition-colors focus:border-[var(--accent-primary)]',
                  isDarkMode
                    ? 'border-white/10 text-white placeholder:text-neutral-500'
                    : 'border-slate-200 text-slate-900 placeholder:text-slate-400'
                )}
              />
            </div>
          )}

          <h2 id="recents-heading" className={cn('mb-1.5 px-2.5 text-[11px] font-medium', mutedText)}>
            Recents
          </h2>

          <ul className="no-scrollbar -mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((chat) => {
                const isEditing = editingChatId === chat.id;
                const isActive = activeChatId === chat.id;
                return (
                  <li
                    key={chat.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({
                        x: Math.min(e.clientX, window.innerWidth - 200),
                        y: Math.min(e.clientY, window.innerHeight - 160),
                        chatId: chat.id,
                      });
                    }}
                    className={cn(
                      'group/item relative flex items-center rounded-lg transition-colors',
                      isActive ? itemActive : itemIdle
                    )}
                  >
                    {isEditing ? (
                      <div className="flex w-full items-center gap-1 px-1.5 py-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          aria-label="Chat title"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCommitRename(chat.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingChatId(null);
                            }
                          }}
                          onBlur={() => handleCommitRename(chat.id)}
                          className={cn(
                            'h-7 w-full rounded-md border px-2 text-xs outline-none',
                            isDarkMode
                              ? 'border-[var(--accent-primary)] bg-black/40 text-white'
                              : 'border-[var(--accent-primary)] bg-white text-slate-900'
                          )}
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleCommitRename(chat.id)}
                          aria-label="Save title"
                          className="cursor-pointer rounded p-1 text-emerald-400 hover:bg-emerald-500/15"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEditingChatId(null)}
                          aria-label="Cancel rename"
                          className="cursor-pointer rounded p-1 text-rose-400 hover:bg-rose-500/15"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectChat?.(chat.id)}
                          aria-current={isActive ? 'page' : undefined}
                          title={chat.title}
                          className="min-w-0 flex-1 cursor-pointer rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                        >
                          <span className="block truncate text-[13px]">{chat.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setContextMenu({
                              x: Math.min(rect.left, window.innerWidth - 200),
                              y: Math.min(rect.bottom + 4, window.innerHeight - 160),
                              chatId: chat.id,
                            });
                          }}
                          aria-label={`Options for ${chat.title}`}
                          aria-haspopup="menu"
                          className={cn(
                            'mr-1 shrink-0 cursor-pointer rounded-md p-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/item:opacity-100',
                            isActive && 'opacity-100',
                            isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200'
                          )}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })
            ) : (
              <li className={cn('flex flex-col items-center gap-2 px-3 py-8 text-center text-xs', mutedText)}>
                <MessageSquare aria-hidden="true" className="size-4" />
                {searchFilter ? 'No chats match your search' : 'Your conversations will appear here'}
              </li>
            )}
          </ul>
        </section>
      ) : (
        <div className="flex-1" />
      )}

      {/* Footer navigation */}
      <nav aria-label="Workspace" className={cn('mt-3 w-full border-t pt-3', isDarkMode ? 'border-white/[0.06]' : 'border-slate-200')}>
        <ul className={cn('flex flex-col gap-0.5', !isSidebarExpanded && 'items-center gap-1')}>
          {footerNav.map(renderNavItem)}
        </ul>
      </nav>

      {/* Profile */}
      <div ref={profileMenuRef} className="group relative mt-2 flex w-full justify-center">
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isProfileMenuOpen}
          aria-label={isSidebarExpanded ? undefined : 'Account menu'}
          className={cn(
            itemBase,
            isSidebarExpanded ? 'w-full gap-2.5 px-2 py-1.5' : 'size-9 justify-center',
            isProfileMenuOpen ? itemActive : itemIdle
          )}
        >
          <span className="relative shrink-0">
            <span
              className={cn(
                'flex size-7 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold',
                isDarkMode ? 'bg-neutral-800 text-neutral-200' : 'bg-slate-200 text-slate-700'
              )}
            >
              {userProfile?.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
          </span>
          {isSidebarExpanded && (
            <>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {userProfile?.displayName || 'User'}
                </span>
                <span className={cn('truncate text-[11px] font-normal', mutedText)}>
                  {userProfile?.email || (userProfile?.username ? `@${userProfile.username}` : 'user@eris.local')}
                </span>
              </span>
              <ChevronsUpDown aria-hidden="true" className={cn('size-3.5 shrink-0', mutedText)} />
            </>
          )}
        </button>
        {!isSidebarExpanded && !isProfileMenuOpen && <Tooltip label={userProfile?.displayName || 'Account'} />}

        {isProfileMenuOpen && (
          <div
            role="menu"
            className={cn(
              'absolute bottom-full z-50 mb-2 w-64 rounded-xl border p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150',
              isSidebarExpanded ? 'left-0' : 'left-full ml-3',
              isDarkMode ? 'border-white/10 bg-neutral-900 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: 'View profile', icon: User, onClick: onOpenSettings },
              { label: 'Account settings', icon: Settings, onClick: onOpenSettings },
              {
                label: 'Documentation',
                icon: BookOpen,
                onClick: () => window.open('https://github.com/EzioAman/Eris', '_blank', 'noopener,noreferrer'),
              },
            ].map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onClick?.();
                }}
                className={cn(itemBase, 'w-full gap-2.5 px-2.5 py-2 text-xs', itemIdle)}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            ))}

            <div className={cn('my-1.5 border-t', isDarkMode ? 'border-white/10' : 'border-slate-200')} />
            <p className={cn('px-2.5 py-1 text-[11px] font-medium', mutedText)}>Switch account</p>
            <div className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-1.5', isDarkMode ? 'bg-white/5' : 'bg-slate-50')}>
              <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-200">
                {userProfile?.avatarUrl ? <img src={userProfile.avatarUrl} alt="" className="size-full object-cover" /> : initial}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">{userProfile?.displayName || 'User'}</span>
                <span className={cn('truncate text-[10px]', mutedText)}>{userProfile?.email || 'user@eris.local'}</span>
              </span>
              <CheckCircle2 aria-label="Active account" className="size-4 shrink-0 text-[var(--accent-primary)]" />
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsProfileMenuOpen(false);
                (onAddAccount ?? onOpenSettings)?.();
              }}
              className={cn(itemBase, 'mt-1 w-full gap-2.5 px-2.5 py-2 text-xs', itemIdle)}
            >
              <UserPlus className="size-4" />
              <span>Add account</span>
            </button>

            <div className={cn('my-1.5 border-t', isDarkMode ? 'border-white/10' : 'border-slate-200')} />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onSignOut?.();
              }}
              className={cn(itemBase, 'w-full gap-2.5 px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10')}
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>

      {/* Chat context menu */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Conversation actions"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className={cn(
            'fixed z-50 w-48 rounded-xl border p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150',
            isDarkMode ? 'border-white/10 bg-neutral-900 text-neutral-200' : 'border-slate-200 bg-white text-slate-800'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const chat = chatHistory.find((c) => c.id === contextMenu.chatId);
              handleStartRename(contextMenu.chatId, chat?.title || '');
            }}
            className={cn(itemBase, 'w-full gap-2.5 px-2.5 py-1.5 text-xs', itemIdle)}
          >
            <Edit3 className="size-3.5" />
            <span>Rename</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteChat?.(contextMenu.chatId, true);
              setContextMenu(null);
            }}
            className={cn(itemBase, 'w-full gap-2.5 px-2.5 py-1.5 text-xs', itemIdle)}
          >
            <Eraser className="size-3.5" />
            <span>Clear messages</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteChat?.(contextMenu.chatId, false);
              setContextMenu(null);
            }}
            className={cn(itemBase, 'w-full gap-2.5 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10')}
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default LeftSidebar;
