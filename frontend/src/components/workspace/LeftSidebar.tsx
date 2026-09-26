import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Search,
  Trash2,
  MoreVertical,
  Edit3,
  Eraser,
  Check,
  X,
  Settings,
  User,
  ChevronsUpDown,
  BookOpen,
  LogOut,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AnimatedList, AnimatedListItem } from '../magicui/animated-list';

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
  onOpenSettings,
  chatHistory = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onScrollToLatest,
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

  const isConnectorsActive = showRightSidebar && (rightSidebarTab === 'connectors' || rightSidebarTab === 'plugins');
  const isToolsActive = showRightSidebar && rightSidebarTab === 'tools';

  // Close context menu & profile menu on global click or Escape
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

  // Focus rename input when editing starts
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
    if (clean) {
      onRenameChat?.(chatId, clean);
    }
    setEditingChatId(null);
  };

  const navItems = [
    {
      id: 'chat',
      label: 'Agent Chat',
      icon: MessageSquare,
      isActive: true,
      onClick: () => {
        if (!isSidebarExpanded) {
          setIsSidebarExpanded(true);
        }
        onScrollToLatest?.();
      },
    },
    {
      id: 'workflows',
      label: 'Workflow Studio',
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

  const filteredHistory = useMemo(() => {
    if (!searchFilter.trim()) return chatHistory;
    const query = searchFilter.toLowerCase();
    return chatHistory.filter((c) => c.title.toLowerCase().includes(query));
  }, [chatHistory, searchFilter]);

  return (
    <aside
      style={isSidebarExpanded && width ? { width } : undefined}
      className={cn(
        'shrink-0 border-r flex flex-col z-10 transition-all duration-200 select-none font-sans relative',
        isSidebarExpanded ? (width ? '' : 'w-64 px-3 py-3.5') : 'w-16 px-2 py-3 items-center',
        'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
      )}
    >
      {/* ─── Untitled UI Slim Icon Rail / Top Primary Navigation ─── */}
      <div className={cn('flex flex-col gap-1.5 w-full', isSidebarExpanded ? 'px-1' : 'items-center')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  'relative rounded-xl flex items-center transition-all cursor-pointer text-xs font-medium',
                  isSidebarExpanded
                    ? 'w-full gap-3 px-3 py-2 text-left'
                    : 'size-10 justify-center',
                  item.isActive
                    ? isDarkMode
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold shadow-xs'
                      : 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold shadow-xs'
                    : isDarkMode
                    ? 'text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/15 border border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 hover:border-slate-300 border border-transparent'
                )}
              >
                {/* Active indicator bar in slim mode */}
                {!isSidebarExpanded && item.isActive && (
                  <span className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-md bg-blue-500" />
                )}

                <Icon className={cn('w-4 h-4 shrink-0 transition-colors', item.isActive ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : 'group-hover:scale-105')} />

                {isSidebarExpanded && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                          isDarkMode ? 'bg-white/10 border-white/10 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Untitled UI Slim Mode Tooltip */}
              {!isSidebarExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900/95 dark:bg-black/95 text-white text-[11px] font-medium whitespace-nowrap shadow-2xl border border-white/15 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Untitled UI Expanded Drawer View (Tier 2 Panel) ─── */}
      {isSidebarExpanded && (
        <div className="flex-1 mt-4 flex flex-col min-h-0 w-full overflow-hidden border-t pt-3.5 border-slate-200 dark:border-white/10 px-1">
          {/* Drawer Header */}
          <div className="px-1 flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wider',
                  isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                )}
              >
                Conversations
              </span>
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                  isDarkMode ? 'bg-white/5 text-neutral-400' : 'bg-slate-100 text-slate-600'
                )}
              >
                {chatHistory.length}
              </span>
            </div>

            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                title="New Chat (Ctrl+N)"
                className={cn(
                  'p-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-xs font-semibold border',
                  isDarkMode
                    ? 'hover:bg-white/10 text-neutral-200 border-white/10 bg-white/5'
                    : 'hover:bg-slate-200 text-slate-700 border-slate-200 bg-slate-50'
                )}
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px]">New</span>
              </button>
            )}
          </div>

          {/* Quick Search in Drawer */}
          {chatHistory.length > 3 && (
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter chats..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={cn(
                  'w-full h-8 pl-8 pr-2.5 rounded-lg text-xs outline-none border transition-colors',
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-blue-500'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                )}
              />
            </div>
          )}

          {/* Drawer Conversation Items */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-0.5">
            {filteredHistory.length > 0 ? (
              <AnimatedList delay={40} className="space-y-1">
                {filteredHistory.map((chat) => {
                  const isEditing = editingChatId === chat.id;

                  return (
                    <AnimatedListItem key={chat.id}>
                      <div
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: Math.min(e.clientX, window.innerWidth - 180),
                            y: Math.min(e.clientY, window.innerHeight - 150),
                            chatId: chat.id,
                          });
                        }}
                        className={cn(
                          'group/item relative flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all border outline-none select-none',
                          activeChatId === chat.id
                            ? isDarkMode
                              ? 'bg-blue-600/15 border-blue-500/30 text-white font-medium shadow-xs'
                              : 'bg-blue-50 border-blue-200 text-blue-700 font-medium shadow-xs'
                            : isDarkMode
                            ? 'border-transparent text-neutral-300 hover:bg-white/5 hover:text-white'
                            : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                        onClick={() => {
                          if (!isEditing) onSelectChat?.(chat.id);
                        }}
                      >
                        <div className="min-w-0 flex-1 pr-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <MessageSquare
                              className={cn(
                                'w-3.5 h-3.5 shrink-0',
                                activeChatId === chat.id
                                  ? 'text-blue-400'
                                  : isDarkMode
                                  ? 'text-neutral-500'
                                  : 'text-slate-400'
                              )}
                            />
                            {isEditing ? (
                              <div
                                className="flex items-center gap-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
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
                                    'w-full text-xs font-semibold px-1.5 py-0.5 rounded outline-none border',
                                    isDarkMode
                                      ? 'bg-black/50 border-blue-500 text-white'
                                      : 'bg-white border-blue-400 text-slate-900'
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommitRename(chat.id);
                                  }}
                                  className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                                  title="Save title"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingChatId(null);
                                  }}
                                  className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-medium truncate leading-tight">
                                {chat.title}
                              </span>
                            )}
                          </div>
                          {!isEditing && (
                            <div
                              className={cn(
                                'text-[10px] font-mono pl-5.5',
                                isDarkMode ? 'text-neutral-500' : 'text-slate-400'
                              )}
                            >
                              {chat.timestamp}
                            </div>
                          )}
                        </div>

                        {/* Meatball Context Menu Trigger Button */}
                        {!isEditing && (
                          <div className="flex items-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setContextMenu({
                                  x: Math.min(rect.left, window.innerWidth - 180),
                                  y: Math.min(rect.bottom + 4, window.innerHeight - 150),
                                  chatId: chat.id,
                                });
                              }}
                              title="Chat options"
                              className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </AnimatedListItem>
                  );
                })}
              </AnimatedList>
            ) : (
              <div className="text-xs text-neutral-400 py-6 text-center">
                {searchFilter ? 'No matching chats found' : 'No recent chats'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Untitled UI Bottom Profile & Slim Mode Controls ─── */}
      <div
        className={cn(
          'mt-auto flex flex-col gap-2 w-full pt-3 border-t',
          isSidebarExpanded ? 'px-1' : 'items-center',
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        )}
      >
        {/* Profile Card & Floating Popover */}
        <div ref={profileMenuRef} className="relative w-full flex justify-center">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={cn(
              'group rounded-xl flex items-center transition-all cursor-pointer text-xs font-medium border border-transparent',
              isSidebarExpanded
                ? 'w-full gap-2.5 px-2.5 py-2 text-left justify-between'
                : 'size-10 justify-center p-0',
              isProfileMenuOpen
                ? isDarkMode
                  ? 'bg-white/10 text-white border-white/15'
                  : 'bg-slate-100 text-slate-900 border-slate-300'
                : isDarkMode
                ? 'text-neutral-300 hover:bg-white/5 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {/* User Avatar with Green Active Dot */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  'rounded-full overflow-hidden flex items-center justify-center font-bold text-xs select-none',
                  isSidebarExpanded ? 'size-9' : 'size-8',
                  isDarkMode ? 'bg-neutral-800 text-neutral-200 border border-white/10' : 'bg-slate-200 text-slate-700 border border-slate-300'
                )}
              >
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(userProfile?.displayName || userProfile?.email || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {/* Online Indicator Green Dot */}
              <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 rounded-full ring-2 ring-[var(--bg-surface)]" />
            </div>

            {/* Profile Name & Email (Shown when expanded) */}
            {isSidebarExpanded && (
              <>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span className="text-xs font-semibold truncate text-[var(--text-primary)]">
                    {userProfile?.displayName || 'User'}
                  </span>
                  <span className="text-[11px] truncate text-neutral-400">
                    {userProfile?.email || (userProfile?.username ? `@${userProfile.username}` : 'user@eris.local')}
                  </span>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-200 transition-colors" />
              </>
            )}
          </button>

          {/* Slim mode hover tooltip */}
          {!isSidebarExpanded && !isProfileMenuOpen && (
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900/95 dark:bg-black/95 text-white text-[11px] font-medium whitespace-nowrap shadow-xl border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {userProfile?.displayName || 'Account'}
            </div>
          )}

          {/* Untitled UI Account Popover (Matches Screenshot 2) */}
          {isProfileMenuOpen && (
            <div
              className={cn(
                'absolute bottom-full mb-2 w-64 rounded-2xl p-2 border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50',
                isSidebarExpanded ? 'left-0' : 'left-full ml-3',
                isDarkMode
                  ? 'bg-[#0E1320]/95 border-white/15 text-neutral-200 shadow-black/60'
                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-400/20'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Navigation Options */}
              <div className="flex flex-col gap-0.5 pb-2 border-b border-white/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left',
                    isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-neutral-400" />
                    <span>View profile</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 dark:border-white/10 text-neutral-400">
                    ⌘K→P
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left',
                    isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-neutral-400" />
                    <span>Account settings</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 dark:border-white/10 text-neutral-400">
                    ⌘S
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    window.open('https://github.com/EzioAman/Eris', '_blank');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left',
                    isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <BookOpen className="w-4 h-4 text-neutral-400" />
                  <span>Documentation</span>
                </button>
              </div>

              {/* Switch Account Section */}
              <div className="py-2 border-b border-white/10 dark:border-white/10">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Switch account
                </div>

                {/* Primary Account (Active) */}
                <div
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition-colors',
                    isDarkMode ? 'bg-white/5' : 'bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="size-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-[10px] bg-neutral-800 text-neutral-200">
                        {userProfile?.avatarUrl ? (
                          <img src={userProfile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(userProfile?.displayName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full ring-2 ring-[var(--bg-surface)]" />
                    </div>
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="text-xs font-medium truncate text-[var(--text-primary)]">
                        {userProfile?.displayName || 'User'}
                      </span>
                      <span className="text-[10px] truncate text-neutral-400">
                        {userProfile?.email || 'user@eris.local'}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 ml-1.5" />
                </div>

                {/* Add Account Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onAddAccount) {
                      onAddAccount();
                    } else {
                      onOpenSettings?.();
                    }
                  }}
                  className={cn(
                    'w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed transition-all cursor-pointer',
                    isDarkMode
                      ? 'border-white/20 text-neutral-300 hover:border-white/40 hover:text-white hover:bg-white/5'
                      : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add account</span>
                </button>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onSignOut?.();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left text-rose-400',
                    isDarkMode ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50 text-rose-600'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-500/20 text-rose-400">
                    ⌥↑Q
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Slim Mode Toggle Button */}
        <div className="relative group w-full flex justify-center">
          <button
            type="button"
            onClick={() => setIsSidebarExpanded((prev) => !prev)}
            title={isSidebarExpanded ? 'Collapse to slim mode' : 'Expand drawer'}
            className={cn(
              'rounded-xl flex items-center transition-colors cursor-pointer text-xs font-medium',
              isSidebarExpanded ? 'w-full gap-3 px-3 py-2 text-left' : 'size-10 justify-center',
              isDarkMode
                ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            {isSidebarExpanded ? (
              <PanelLeftClose className="w-4 h-4 shrink-0" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 shrink-0" />
            )}
            {isSidebarExpanded && (
              <span className="truncate">Slim Mode</span>
            )}
          </button>
          {!isSidebarExpanded && (
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-neutral-900/95 dark:bg-black/95 text-white text-[11px] font-medium whitespace-nowrap shadow-xl border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Expand Drawer
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating Chat Session Context Menu (Delete & Rename) ─── */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className={cn(
            'fixed z-50 w-48 rounded-2xl p-1.5 border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150',
            isDarkMode
              ? 'bg-[#0E1320] border-white/10 text-neutral-200'
              : 'bg-white border-slate-200 text-slate-800'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
            Conversation Actions
          </div>

          {/* Rename Option */}
          <button
            type="button"
            onClick={() => {
              const chat = chatHistory.find((c) => c.id === contextMenu.chatId);
              handleStartRename(contextMenu.chatId, chat?.title || '');
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
              isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Rename chat</span>
          </button>

          {/* Clear Messages Option */}
          <button
            type="button"
            onClick={() => {
              onDeleteChat?.(contextMenu.chatId, true);
              setContextMenu(null);
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
              isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Eraser className="w-3.5 h-3.5 text-amber-400" />
            <span>Clear messages</span>
          </button>

          {/* Delete Option */}
          <button
            type="button"
            onClick={() => {
              onDeleteChat?.(contextMenu.chatId, false);
              setContextMenu(null);
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left text-rose-400',
              isDarkMode ? 'hover:bg-rose-500/15' : 'hover:bg-rose-50'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete conversation</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default LeftSidebar;
