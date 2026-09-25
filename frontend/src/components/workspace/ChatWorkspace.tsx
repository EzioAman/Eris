import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import type { SessionConfigStatus } from '../onboarding/authActions';
import type {
  ChatMessage,
  ConnectorItem,
  ChatTool,
  ToolApprovalItem,
  ActiveThinkingState,
} from './chatTypes';
import { PanelRight } from 'lucide-react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { LeftSidebar } from './LeftSidebar';
import { ChatCanvas } from './ChatCanvas';
import { ChatInputBar } from './ChatInputBar';
import { RightSidebar } from './RightSidebar';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ModelConfigModal } from './ModelConfigModal';
import { WorkspaceTreePanel } from './WorkspaceTreePanel';
import { FilePreviewModal } from './FilePreviewModal';
import { PluginConfigModal, type PluginItem } from './PluginConfigModal';
import { CommandPaletteModal } from './CommandPaletteModal';
import { ApiKeyVaultModal } from '../settings/ApiKeyVaultModal';
import { LegalTermsModal } from '../legal/LegalTermsModal';
import { TemplateGallery } from '../dev/TemplateGallery';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutManager';
import { useAppState } from '../../context/AppStateContext';
import {
  toggleWorkspaceTheme,
  toggleWorkspaceExecutionMode,
  selectWorkspaceModel,
  clearActiveConversation,
  activateSidebarTab,
  type ThemeTransitionOrigin,
} from '../../lib/workspaceActions';

const INITIAL_CONNECTORS: ConnectorItem[] = [
  { id: 'c1', name: 'Google Drive', icon: 'google-drive', status: 'off', category: 'storage', description: 'Sync files from Google Drive' },
  { id: 'c2', name: 'Gmail', icon: 'gmail', status: 'off', category: 'communication', description: 'Read and send emails' },
  { id: 'c3', name: 'Notion', icon: 'notion', status: 'off', category: 'productivity', description: 'Search and link Notion notes' },
  { id: 'c4', name: 'Slack', icon: 'slack', status: 'off', category: 'communication', description: 'Send messages and alerts to Slack' },
  { id: 'c5', name: 'GitHub', icon: 'github', status: 'off', category: 'dev', description: 'Access PRs, issues, and code repositories' },
];

export interface ChatWorkspaceProps {
  sessionStatus?: SessionConfigStatus | null;
  onSignOut?: () => void;
  onReturnToIntro?: () => void;
  onReturnToGreeting?: () => void;
  className?: string;
}

// ─── Draggable Resizable Splitter Handle ───
const ResizeHandle: React.FC<{
  onDrag: (deltaX: number) => void;
  isDarkMode: boolean;
  className?: string;
}> = ({ onDrag, isDarkMode, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    startXRef.current = e.clientX;
    onDrag(deltaX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        'w-1 hover:w-1.5 shrink-0 h-full cursor-col-resize z-30 transition-all select-none',
        isDragging
          ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
          : isDarkMode
            ? 'bg-transparent hover:bg-cyan-500/40'
            : 'bg-transparent hover:bg-blue-400/40',
        className
      )}
    />
  );
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  sessionStatus,
  onSignOut,
  onReturnToIntro,
  onReturnToGreeting,
  className,
}) => {
  const { navigate } = useAppState();

  // White / Light Mode by Default
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('eris_theme');
      return stored ? stored === 'dark' : false;
    } catch {
      return false;
    }
  });

  // Sync with global classList for seamless theme view transitions
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const handleToggleTheme = useCallback((origin?: ThemeTransitionOrigin) => {
    toggleWorkspaceTheme(isDarkMode, setIsDarkMode, origin);
  }, [isDarkMode]);

  // Multi-Chat Sessions & History Management (Real state backed by localStorage)
  const userProfile = React.useMemo(() => {
    const rawDisplayName = sessionStatus?.displayName || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_display_name') : null);
    const rawUsername = sessionStatus?.username || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_username') : null);
    const rawAvatar = sessionStatus?.avatarUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_avatar') : null);
    return {
      displayName: rawDisplayName || sessionStatus?.email?.split('@')[0] || 'User',
      username: rawUsername || undefined,
      avatarUrl: rawAvatar || undefined,
    };
  }, [sessionStatus]);

  // Compute user-scoped key so different accounts have completely isolated chats
  const userScopeKey = React.useMemo(() => {
    const raw = sessionStatus?.email?.toLowerCase().trim() || sessionStatus?.username?.toLowerCase().trim() || 'default_user';
    return raw.replace(/[^a-zA-Z0-9_\-]/g, '_');
  }, [sessionStatus?.email, sessionStatus?.username]);

  const loadUserSessions = useCallback((scope: string) => {
    try {
      const stored = localStorage.getItem(`eris_chat_sessions_${scope}`) || (scope === 'default_user' ? localStorage.getItem('eris_chat_sessions') : null);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return [{ id: '1', title: 'New Conversation', timestamp: 'Active now' }];
  }, []);

  const loadUserConversations = useCallback((scope: string) => {
    try {
      const stored = localStorage.getItem(`eris_chat_conversations_${scope}`) || (scope === 'default_user' ? localStorage.getItem('eris_chat_conversations') : null);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch { }
    return { '1': [] };
  }, []);

  const [chatSessions, setChatSessions] = useState<{ id: string; title: string; timestamp: string }[]>(() => loadUserSessions(userScopeKey));
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => loadUserConversations(userScopeKey));
  const [activeChatId, setActiveChatId] = useState<string>(() => chatSessions[0]?.id || '1');
  const [messages, setMessages] = useState<ChatMessage[]>(() => conversations[activeChatId] || []);

  // When active account changes (e.g. login with different Google account), immediately switch conversation store
  useEffect(() => {
    const loadedSessions = loadUserSessions(userScopeKey);
    const loadedConvs = loadUserConversations(userScopeKey);
    const firstId = loadedSessions[0]?.id || '1';
    setChatSessions(loadedSessions);
    setConversations(loadedConvs);
    setActiveChatId(firstId);
    setMessages(loadedConvs[firstId] || []);
  }, [userScopeKey, loadUserSessions, loadUserConversations]);

  // Sync real chat sessions & conversations to user-scoped local storage
  useEffect(() => {
    try {
      localStorage.setItem(`eris_chat_sessions_${userScopeKey}`, JSON.stringify(chatSessions));
    } catch { }
  }, [chatSessions, userScopeKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`eris_chat_conversations_${userScopeKey}`, JSON.stringify(conversations));
    } catch { }
  }, [conversations, userScopeKey]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeThinking, setActiveThinking] = useState<ActiveThinkingState | null>(null);
  const [executingApprovalId, setExecutingApprovalId] = useState<string | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // User-Resizable Panel Dimensions with LocalStorage Persistence
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => {
    try {
      const v = localStorage.getItem('eris_left_width');
      return v ? Math.min(360, Math.max(180, parseInt(v, 10))) : 224;
    } catch {
      return 224;
    }
  });

  const [workspaceTreeWidth, setWorkspaceTreeWidth] = useState<number>(() => {
    try {
      const v = localStorage.getItem('eris_tree_width');
      return v ? Math.min(420, Math.max(200, parseInt(v, 10))) : 290;
    } catch {
      return 290;
    }
  });

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => {
    try {
      const v = localStorage.getItem('eris_right_width');
      return v ? Math.min(400, Math.max(220, parseInt(v, 10))) : 256;
    } catch {
      return 256;
    }
  });

  const handleResizeLeft = useCallback((deltaX: number) => {
    setLeftSidebarWidth((prev) => {
      const next = Math.min(360, Math.max(180, prev + deltaX));
      try { localStorage.setItem('eris_left_width', String(next)); } catch { }
      return next;
    });
  }, []);

  const handleResizeTree = useCallback((deltaX: number) => {
    setWorkspaceTreeWidth((prev) => {
      const next = Math.min(420, Math.max(200, prev + deltaX));
      try { localStorage.setItem('eris_tree_width', String(next)); } catch { }
      return next;
    });
  }, []);

  const handleResizeRight = useCallback((deltaX: number) => {
    setRightSidebarWidth((prev) => {
      const next = Math.min(400, Math.max(220, prev - deltaX));
      try { localStorage.setItem('eris_right_width', String(next)); } catch { }
      return next;
    });
  }, []);

  // Panels visibility persisted to localStorage until user explicitly signs out
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eris_is_sidebar_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const [showWorkspaceTree, setShowWorkspaceTree] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('eris_show_workspace_tree');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('eris_show_right_sidebar');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [rightSidebarTab, setRightSidebarTab] = useState<'connectors' | 'plugins' | 'tools'>(() => {
    try {
      const stored = localStorage.getItem('eris_right_sidebar_tab');
      return (stored as any) || 'plugins';
    } catch {
      return 'plugins';
    }
  });

  // Keep localStorage in sync whenever user modifies panel visibility
  useEffect(() => {
    try {
      localStorage.setItem('eris_is_sidebar_expanded', String(isSidebarExpanded));
    } catch { }
  }, [isSidebarExpanded]);

  useEffect(() => {
    try {
      localStorage.setItem('eris_show_workspace_tree', String(showWorkspaceTree));
    } catch { }
  }, [showWorkspaceTree]);

  useEffect(() => {
    try {
      localStorage.setItem('eris_show_right_sidebar', String(showRightSidebar));
    } catch { }
  }, [showRightSidebar]);

  useEffect(() => {
    try {
      localStorage.setItem('eris_right_sidebar_tab', rightSidebarTab);
    } catch { }
  }, [rightSidebarTab]);

  const [connectors, setConnectors] = useState<ConnectorItem[]>(INITIAL_CONNECTORS);
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [activePluginToConfig, setActivePluginToConfig] = useState<PluginItem | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isApiKeyVaultOpen, setIsApiKeyVaultOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('eris_informed_consent_v1');
    } catch {
      return false;
    }
  });
  const [isFirstRunConsent, setIsFirstRunConsent] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('eris_informed_consent_v1');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOpenLegal = () => {
      setIsFirstRunConsent(false);
      setIsLegalModalOpen(true);
    };
    window.addEventListener('eris:open-legal-terms', handleOpenLegal);
    return () => {
      window.removeEventListener('eris:open-legal-terms', handleOpenLegal);
    };
  }, []);

  // Fetch real plugins from backend
  const fetchPlugins = useCallback(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.plugins)) {
          setPlugins(data.plugins);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchPlugins();
    fetch('/api/tools')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.tools)) {
          setTools(data.tools);
        }
      })
      .catch(() => { });
    fetch('/api/connectors')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.connectors)) {
          setConnectors(data.connectors);
        }
      })
      .catch(() => { });

    // Auto-prompt API Key Vault modal on dashboard if local encrypted vault is empty
    fetch('/api/keys')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.keys) && data.keys.length === 0) {
          setIsApiKeyVaultOpen(true);
        }
      })
      .catch(() => { });
  }, [fetchPlugins]);

  // Global listener for opening API Key Vault
  useEffect(() => {
    const handleOpenVault = () => {
      setIsModelConfigOpen(false);
      setIsApiKeyVaultOpen(true);
    };
    window.addEventListener('eris:open-vault', handleOpenVault);
    return () => window.removeEventListener('eris:open-vault', handleOpenVault);
  }, []);

  const handleTogglePlugin = useCallback((plugin: PluginItem) => {
    if (plugin.dependency && !plugin.is_configured && !plugin.is_enabled) {
      setActivePluginToConfig(plugin);
      return;
    }

    fetch(`/api/plugins/${plugin.id}/toggle`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setPlugins((prev) =>
            prev.map((p) => (p.id === plugin.id ? { ...p, is_enabled: data.is_enabled } : p))
          );
        } else if (data.requires_config) {
          setActivePluginToConfig(plugin);
        }
      })
      .catch(() => { });
  }, []);

  const handleSavePluginConfig = async (pluginId: string, config: Record<string, any>) => {
    const res = await fetch(`/api/plugins/${pluginId}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.detail || data.message || 'Configuration failed');
    }
    fetchPlugins();
  };

  const handleToggleConnector = useCallback((id: string) => {
    fetch(`/api/connectors/${id}/toggle`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setConnectors((prev) =>
            prev.map((c) => (c.id === id ? { ...c, status: data.status } : c))
          );
        }
      })
      .catch(() => {
        setConnectors((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: c.status === 'on' ? 'off' : 'on' } : c))
        );
      });
  }, []);

  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isModelConfigOpen, setIsModelConfigOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string } | null>(null);

  // Active Model & Execution Mode State synced across workspace
  const [activeModel, setActiveModel] = useState<string>('');
  const [executionMode, setExecutionMode] = useState<'speed' | 'accuracy'>('speed');

  useEffect(() => {
    fetch('/api/system/state')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          if (data.active_model) setActiveModel(data.active_model);
          else setActiveModel('');
          if (data.execution_mode) setExecutionMode(data.execution_mode);
        }
      })
      .catch(() => { });

    const handleModelChanged = (e: Event) => {
      const custom = e as CustomEvent<{ modelId: string }>;
      if (custom.detail?.modelId) {
        setActiveModel(custom.detail.modelId);
      }
    };
    const handleModeChanged = (e: Event) => {
      const custom = e as CustomEvent<{ mode: 'speed' | 'accuracy' }>;
      if (custom.detail?.mode) {
        setExecutionMode(custom.detail.mode);
      }
    };

    const handleOpenModelConfig = () => {
      setIsModelConfigOpen(true);
    };

    window.addEventListener('eris:model-changed', handleModelChanged);
    window.addEventListener('eris:mode-changed', handleModeChanged);
    window.addEventListener('eris:open-model-config', handleOpenModelConfig);
    return () => {
      window.removeEventListener('eris:model-changed', handleModelChanged);
      window.removeEventListener('eris:mode-changed', handleModeChanged);
      window.removeEventListener('eris:open-model-config', handleOpenModelConfig);
    };
  }, []);

  const handleToggleExecutionMode = useCallback(() => {
    toggleWorkspaceExecutionMode(executionMode, setExecutionMode);
  }, [executionMode]);

  const streamIntervalRef = useRef<number | null>(null);
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  // Switch Conversation
  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setMessages(conversationsRef.current[id] || []);
    setIsStreaming(false);
    setStreamingText('');
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
  }, []);

  // Scroll chat to latest message
  const handleScrollToLatest = useCallback(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  // Create New Chat
  const handleNewChat = useCallback(() => {
    const newId = crypto.randomUUID();
    const newSession = {
      id: newId,
      title: 'New Conversation',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newId);
    setMessages([]);
    setConversations((prev) => ({ ...prev, [newId]: [] }));
    setIsStreaming(false);
    setStreamingText('');
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
  }, []);

  useEffect(() => {
    const handleNew = () => handleNewChat();
    window.addEventListener('eris:new-chat', handleNew);
    return () => window.removeEventListener('eris:new-chat', handleNew);
  }, [handleNewChat]);

  // Clear Chat
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setConversations((prev) => ({ ...prev, [activeChatId]: [] }));
    setIsStreaming(false);
    setStreamingText('');
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
  }, [activeChatId]);

  // Right-Click Delete Chat & Clear Memory
  const handleDeleteChat = useCallback((chatId: string, clearMemoryOnly: boolean = false) => {
    fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '/clear', sessionId: chatId }),
    }).catch(() => { });

    if (clearMemoryOnly) {
      setConversations((prev) => ({ ...prev, [chatId]: [] }));
      if (activeChatId === chatId) {
        setMessages([]);
      }
    } else {
      setChatSessions((prev) => {
        const next = prev.filter((s) => s.id !== chatId);
        if (next.length === 0) {
          const freshId = crypto.randomUUID();
          const freshSession = { id: freshId, title: 'Main Session', timestamp: 'Active now' };
          setActiveChatId(freshId);
          setMessages([]);
          setConversations({ [freshId]: [] });
          return [freshSession];
        } else if (activeChatId === chatId) {
          const nextActive = next[0];
          setActiveChatId(nextActive.id);
          setMessages(conversationsRef.current[nextActive.id] || []);
        }
        return next;
      });
      setConversations((prev) => {
        const copy = { ...prev };
        delete copy[chatId];
        return copy;
      });
    }
  }, [activeChatId]);

  // Toggle Handlers
  const handleToggleConnectors = useCallback(() => {
    if (showRightSidebar && rightSidebarTab === 'connectors') {
      setShowRightSidebar(false);
    } else {
      setShowRightSidebar(true);
      setRightSidebarTab('connectors');
    }
  }, [showRightSidebar, rightSidebarTab]);

  const handleToggleTools = useCallback(() => {
    if (showRightSidebar && rightSidebarTab === 'tools') {
      setShowRightSidebar(false);
    } else {
      setShowRightSidebar(true);
      setRightSidebarTab('tools');
    }
  }, [showRightSidebar, rightSidebarTab]);

  const handleToggleWorkspaceTree = useCallback(() => {
    setShowWorkspaceTree((prev) => !prev);
  }, []);

  // Global Keyboard Shortcuts
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut('ctrl+b', () => setShowRightSidebar((prev) => !prev), {
      description: 'Toggle side panel',
      scope: 'Workspace',
    });
    registerShortcut('ctrl+n', handleNewChat, {
      description: 'New chat',
      scope: 'Workspace',
    });
    registerShortcut('ctrl+d', handleToggleTheme, {
      description: 'Toggle theme',
      scope: 'Workspace',
    });
    registerShortcut('ctrl+shift+e', handleToggleWorkspaceTree, {
      description: 'Toggle workspace tree',
      scope: 'Workspace',
    });
    registerShortcut('ctrl+2', () => setIsModelConfigOpen(true), {
      description: 'Open Model Matrix',
      scope: 'Workspace',
    });
    registerShortcut('ctrl+k', () => setIsCommandPaletteOpen((prev) => !prev), {
      description: 'Open Universal Search & Command Palette',
      scope: 'Global',
    });
    return () => {
      unregisterShortcut('ctrl+b');
      unregisterShortcut('ctrl+n');
      unregisterShortcut('ctrl+d');
      unregisterShortcut('ctrl+shift+e');
      unregisterShortcut('ctrl+2');
      unregisterShortcut('ctrl+k');
    };
  }, [registerShortcut, unregisterShortcut, handleNewChat, handleToggleTheme, handleToggleWorkspaceTree]);

  const handleOpenBrowser = useCallback(
    (targetInput: string = '') => {
      const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const clean = targetInput.trim().replace(/^\/browser\s*/i, '').trim();

      let finalUrl = 'https://duckduckgo.com';
      let title = 'Web Browser';
      let text = 'Web Browser session ready. Use the browser address bar above to enter a URL or search query, or ask ERIS to browse.';

      if (clean) {
        if (clean.startsWith('http://') || clean.startsWith('https://')) {
          finalUrl = clean;
          title = clean;
          text = `Opened browser session for: ${clean}`;
        } else {
          finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(clean)}`;
          title = `Search: ${clean}`;
          text = `Searching web for: "${clean}"`;
        }
      }

      const browserMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text,
        timestamp: timeStr,
        templateType: 'safari-preview',
        templateData: {
          url: finalUrl,
          title,
          readerContent: clean ? `Navigating to ${finalUrl}...` : 'Enter a query or URL in the address bar above to search or inspect webpage contents.',
        },
      };
      setMessages((prev) => {
        const next = [...prev, browserMsg];
        setConversations((c) => ({ ...c, [activeChatId]: next }));
        return next;
      });
    },
    [activeChatId]
  );

  // ─── Messaging Logic with Live SSE Streaming & Claude Thinking ───
  const handleSendMessage = useCallback(
    async (text: string, isWebSearch: boolean = false) => {
      if (!text.trim()) return;

      // Quick intercept for UI Templates Gallery command
      if (/^\s*(\/templates|\/gallery|show templates|open templates)\s*$/i.test(text.trim())) {
        setShowTemplateGallery(true);
        return;
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const newUserMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        timestamp: timeStr,
      };

      // Dynamically title session from first prompt if untitled
      setChatSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeChatId && (s.title === 'New Conversation' || s.title === 'Main Session')) {
            const clean = text.trim().slice(0, 30);
            return {
              ...s,
              title: clean.length < text.trim().length ? `${clean}…` : clean,
              timestamp: 'Active now',
            };
          }
          return s;
        })
      );

      // Check if user has keys in the encrypted local vault before running reasoning
      try {
        const keyRes = await fetch('/api/keys');
        const keyData = await keyRes.json();
        if (keyData.ok && Array.isArray(keyData.keys) && keyData.keys.length === 0) {
          setIsApiKeyVaultOpen(true);
          const noKeyMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: "ERIS requires at least one LLM API key configured in your local encrypted vault before reasoning can start. I've opened the API Key Vault for you—please configure your key to proceed.",
            timestamp: timeStr,
          };
          setMessages((prev) => {
            const next = [...prev, newUserMsg, noKeyMsg];
            setConversations((c) => ({ ...c, [activeChatId]: next }));
            return next;
          });
          return;
        }
      } catch {
        // Fallback to proceed if offline or endpoint error
      }

      setMessages((prev) => {
        const next = [...prev, newUserMsg];
        setConversations((c) => ({ ...c, [activeChatId]: next }));
        return next;
      });

      setIsStreaming(true);
      setStreamingText('');
      const startTime = Date.now();

      setActiveThinking({
        startTime,
        elapsedSeconds: 0,
        activeModel: undefined,
        switches: [],
        currentAction: 'Connecting to ERIS Core...',
        actions: [],
        thoughts: [],
        reasoning: '',
        searches: [],
        turn: 1,
      });

      try {
        const token = sessionStatus?.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_session_token') : null);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/chat/message/stream', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: text,
            sessionId: `${userScopeKey}_${activeChatId}`,
            userId: userScopeKey,
            isWebSearch,
            model: activeModel || undefined,
            executionMode,
          }),
        });

        if (!response.body) {
          throw new Error('ReadableStream not supported on this response.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let donePayload: any = null;
        const accumulatedThoughts: string[] = [];
        const accumulatedSwitches: string[] = [];
        const accumulatedSearches: any[] = [];
        let hasStreamedChunks = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const trimmed = block.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (!jsonStr) continue;

            try {
              const ev = JSON.parse(jsonStr);

              if (ev.type === 'switch' || ev.type === 'model_switch') {
                if (ev.model) {
                  setActiveModel(ev.model);
                  accumulatedSwitches.push(ev.text || ev.model);
                  window.dispatchEvent(new CustomEvent('eris:model-changed', { detail: { modelId: ev.model } }));
                }
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      activeModel: ev.model || prev.activeModel,
                      switches: [...prev.switches, ev.text || ev.model],
                    }
                    : null
                );
              } else if (ev.type === 'usage') {
                window.dispatchEvent(new CustomEvent('eris:token-usage', { detail: { usage: ev, model: ev.model || activeModel } }));
              } else if (ev.type === 'turn_start') {
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      activeModel: ev.model || prev.activeModel,
                      turn: ev.turn || prev.turn,
                      currentAction: ev.text,
                    }
                    : null
                );
              } else if (ev.type === 'action') {
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      currentAction: ev.text,
                      actions: [...prev.actions, ev.text],
                    }
                    : null
                );
              } else if (ev.type === 'subagent_spawn') {
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      currentAction: `❖ Swarm Delegation: Spawning [${ev.role}] -> ${ev.objective}`,
                      actions: [...prev.actions, `SPAWN_AGENT ${ev.role}|${ev.objective}`],
                    }
                    : null
                );
              } else if (ev.type === 'thought') {
                accumulatedThoughts.push(ev.text);
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      thoughts: [...prev.thoughts, ev.text],
                      reasoning: prev.reasoning ? `${prev.reasoning}\n\n${ev.text}` : ev.text,
                      currentAction: undefined,
                    }
                    : null
                );
              } else if (ev.type === 'search') {
                accumulatedSearches.push({ query: ev.query, status: ev.status, results: ev.results });
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      searches: [
                        ...(prev.searches || []).filter((s) => s.query !== ev.query),
                        { query: ev.query, status: ev.status, results: ev.results },
                      ],
                    }
                    : null
                );
              } else if (ev.type === 'observation') {
                setActiveThinking((prev) =>
                  prev
                    ? {
                      ...prev,
                      currentAction: ev.text,
                    }
                    : null
                );
              } else if (ev.type === 'chunk' || ev.type === 'token') {
                if (ev.text) {
                  hasStreamedChunks = true;
                  setStreamingText((prev) => prev + ev.text);
                }
              } else if (ev.type === 'done') {
                donePayload = ev;
                if (ev.usage) {
                  window.dispatchEvent(new CustomEvent('eris:token-usage', { detail: { usage: ev.usage, model: ev.model || activeModel } }));
                }
                if (ev.model && ev.model !== activeModel) {
                  setActiveModel(ev.model);
                  window.dispatchEvent(new CustomEvent('eris:model-changed', { detail: { modelId: ev.model } }));
                }
              }
            } catch (pErr) {
              console.warn('SSE parse error:', pErr);
            }
          }
        }

        const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        setActiveThinking(null);

        const finalReply = donePayload?.reply || 'Request completed.';
        const rawToolCalls = donePayload?.toolCalls || [];

        const assistantTools: ChatTool[] = rawToolCalls.map((t: any, idx: number) => {
          if (t.kind === 'approval') {
            return {
              kind: 'approval' as const,
              id: t.id || `appr-${idx}`,
              action: t.action || t.name || 'Execute Action',
              target: t.target || t.command || '',
              input: t.input || t.command || '',
              command: t.command || t.input || t.target || '',
              consequence: t.consequence || 'Execution requires explicit user approval.',
              riskLevel: t.riskLevel || 'moderate',
              decision: 'pending' as const,
            };
          }
          return {
            kind: 'output' as const,
            id: t.id || `tool-${Date.now()}-${idx}`,
            name: t.name || t.tool || 'Tool Execution',
            output: t.output || '',
            duration: t.duration || '0.05s',
          };
        });

        const lowerText = text.toLowerCase();

        const getToolName = (t: ChatTool) => {
          if (t.kind === 'output') return (t.name || '').toLowerCase();
          if (t.kind === 'approval') return ((t.action || '') + ' ' + (t.command || '')).toLowerCase();
          if (t.kind === 'flow') return (t.task?.title || '').toLowerCase();
          return '';
        };

        // 1. Tool execution inspect
        const mediaTool = assistantTools.find((t) => getToolName(t).includes('play_youtube')) ||
          rawToolCalls.find((t: any) => (t.name || '').includes('play_youtube'));
        const termTool = assistantTools.find((t) => getToolName(t).includes('run_command')) ||
          rawToolCalls.find((t: any) => (t.name || '').includes('run_command')) ||
          assistantTools.find((t) => t.kind === 'approval' && t.command);
        const editTool = assistantTools.find((t) => 
          getToolName(t).includes('write_to_file') || 
          getToolName(t).includes('replace_file_content') ||
          getToolName(t).includes('create_custom_tool') ||
          getToolName(t).includes('write_file')
        ) || rawToolCalls.find((t: any) => 
          (t.name || '').includes('write_to_file') || 
          (t.name || '').includes('replace_file_content') ||
          (t.name || '').includes('create_custom_tool') ||
          (t.name || '').includes('write_file')
        );
        const browserTool = assistantTools.find((t) => getToolName(t).includes('open_browser') || getToolName(t).includes('open_url')) ||
          rawToolCalls.find((t: any) => (t.name || '').includes('open_browser') || (t.name || '').includes('open_url'));

        // Check if an action is pending approval (work is not finished)
        const isPendingApproval = assistantTools.some(
          (t) => t.kind === 'approval' && t.decision === 'pending'
        );

        // Check if user's intent is inspection, repair, or code editing
        const isCodeTask = /\b(fix|repair|edit|modify|refactor|inspect|show me|review|check|code|file|tool)\b/i.test(lowerText);

        // 2. Media Player detection (ONLY when work is done, user asked for playback, and NOT a code task)
        const isExplicitMedia =
          !isPendingApproval &&
          !isCodeTask &&
          (
            text.trim().startsWith('/media') ||
            text.trim().startsWith('/play') ||
            text.trim() === '/template media' ||
            /^(play|listen to|hear)\s+(?!the\s+tool|the\s+code|play_youtube).+/i.test(text.trim()) ||
            (!!mediaTool && (String(mediaTool.output || '').includes('Playing') || String(mediaTool.output || '').includes('Playback triggered') || String(mediaTool.output || '').includes('youtube.com')))
          );

        // 3. Code comparison detection (triggers when a file was modified or code diff requested)
        const isCodeComparison =
          !isPendingApproval &&
          (
            !!editTool ||
            text.trim().startsWith('/compare') ||
            text.trim() === '/template diff' ||
            text.trim() === '/template code-comparison' ||
            /\b(compare code|code comparison|code diff|show diff|show code|view diff|show changes)\b/i.test(lowerText) ||
            /\b(before and after|magicui code)\b/i.test(lowerText) ||
            finalReply.includes('```diff')
          );

        // 4. Terminal detection (explicit user request only, never incidental agent commands)
        const isTerminalRequest =
          !isPendingApproval &&
          (
            text.trim().startsWith('/terminal') ||
            text.trim() === '/template terminal' ||
            /\b(open terminal|test terminal|win32 terminal|shell terminal)\b/i.test(lowerText)
          );

        // 5. File Tree detection (explicit user requests only, never incidental tool calls)
        const isFileTreeRequest =
          !isPendingApproval &&
          (
            text.trim().startsWith('/tree') ||
            text.trim() === '/template tree' ||
            text.trim() === '/template file-tree' ||
            /\b(file tree|folder tree|project structure|directory structure|show file tree|file explorer)\b/i.test(lowerText)
          );

        // 6. Web Inspector / Safari preview detection
        const scanSourceText = (text + ' ' + finalReply).replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, ' ');
        const explicitUrlMatch = scanSourceText.match(/https?:\/\/[^\s\)<>"]+/i);
        const bareDomainMatch = scanSourceText.match(/\b((?:www\.)?[a-zA-Z0-9-]+\.(?:com|org|net|io|ai|dev|app|co|edu)(?:\/[^\s\)<>"]*)?)/i);

        let targetUrl: string | null = null;
        if (explicitUrlMatch) {
          targetUrl = explicitUrlMatch[0];
        } else if (bareDomainMatch && !/\b(youtube\.com|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com)\b/i.test(bareDomainMatch[1])) {
          targetUrl = `https://${bareDomainMatch[1].replace(/^www\./, '')}`;
        } else if (isWebSearch) {
          targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(text)}`;
        }

        const isSafariPreview =
          !isPendingApproval &&
          !isCodeTask &&
          (
            text.trim().startsWith('/browse') ||
            text.trim().startsWith('/search') ||
            text.trim() === '/template safari' ||
            text.trim() === '/template web' ||
            isWebSearch ||
            (!!browserTool && !!targetUrl)
          );

        const isAndroidPreview =
          !isPendingApproval &&
          (text.trim() === '/template android' ||
          /\b(android|android preview|android device|pixel phone|apk preview)\b/i.test(lowerText));

        const isIosPreview =
          !isPendingApproval &&
          (text.trim() === '/template ios' ||
          /\b(ios|iphone|ios preview|apple device|dynamic island|swiftui preview)\b/i.test(lowerText));

        const isSubagentsRequest =
          !isPendingApproval &&
          (text.trim() === '/template subagent' ||
          text.trim() === '/template subagent-chain' ||
          /\b(subagent|subagents|swarm|list subagents|show subagents|all subagents|spawn subagent|chain reasoning)\b/i.test(lowerText) ||
          rawToolCalls.some((t: any) => (t.name || t.action || '').includes('SPAWN_AGENT')));

        let templateType: string | undefined = undefined;
        let templateData: any = undefined;

        const isEmailAction = assistantTools.some((t) => {
          if (t.kind === 'approval') {
            return (t.action || '').toLowerCase().includes('email') || (t.command || '').toLowerCase().includes('send_email');
          }
          if (t.kind === 'output') {
            return (t.name || '').toLowerCase().includes('send_email');
          }
          return false;
        });

        if (isCodeComparison) {
          templateType = 'code-comparison';
          const diffMatch = finalReply.match(/```diff\n([\s\S]*?)```/);
          if (diffMatch) {
            const lines = diffMatch[1].split('\n');
            const beforeLines = lines.filter((l: string) => !l.startsWith('+')).map((l: string) => l.replace(/^-/, ' '));
            const afterLines = lines.filter((l: string) => !l.startsWith('-')).map((l: string) => l.replace(/^\+/, ' '));
            templateData = {
              fileName: 'diff_view.py',
              language: 'python',
              before: beforeLines.join('\n') || '# Original code',
              after: afterLines.join('\n') || '# Modified code',
            };
          } else if (editTool) {
            const args = editTool.args || {};
            const filePath = args.path || args.file_path || args.name || args.TargetFile || 'tools/play_youtube_song.py';
            const fileName = filePath.split(/[/\\]/).pop() || 'play_youtube_song.py';
            const lang = fileName.endsWith('.ts') || fileName.endsWith('.tsx') ? 'typescript' : 'python';
            const newCode = args.content || args.code || args.ReplacementContent || args.CodeContent || '';
            const codeBlock = finalReply.match(/```(?:python|ts|tsx|js)?\n([\s\S]*?)```/)?.[1] || '';

            templateData = {
              fileName: fileName,
              language: lang,
              before: `# Original stub: ${fileName}\n\ndef execute(args: str = "") -> str:\n    return "Loaded song into ERIS Media Player for playback."`,
              after: newCode || codeBlock || finalReply,
            };
          } else {
            const codeBlockMatch = finalReply.match(/```(?:python|ts|tsx|js|json)?\n([\s\S]*?)```/);
            if (codeBlockMatch) {
              templateData = {
                fileName: 'code_view.py',
                language: 'python',
                before: '# Previous version',
                after: codeBlockMatch[1],
              };
            } else {
              templateData = {
                fileName: 'auth_service.ts',
                language: 'typescript',
                before: `// User Session Verification\nexport async function verifyUserSession(token: string) {\n  const user = await db.users.findUnique({ where: { token } });\n  if (!user) return null;\n  return { id: user.id, email: user.email };\n}`,
                after: `// Session Authentication Service with SHA-256 Digest\nexport async function verifyUserSession(token: string): Promise<UserSession | null> {\n  const session = await db.sessions.findUnique({\n    where: { token_hash: sha256(token) },\n    include: { user: true },\n  });\n  if (!session || session.expires_at < new Date()) {\n    return null;\n  }\n  return {\n    userId: session.user.id,\n    username: session.user.username,\n    displayName: session.user.display_name,\n    role: session.user.role,\n  };\n}`,
              };
            }
          }
        } else if (isFileTreeRequest) {
          templateType = 'file-tree';
          templateData = {
            nodes: [
              {
                id: 'root',
                name: 'ERIS Project Workspace',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    id: 'backend',
                    name: 'backend',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        id: 'app_pkg',
                        name: 'app',
                        type: 'folder',
                        isExpanded: false,
                        children: [
                          { id: 'main_file', name: 'main.py', type: 'file' },
                          { id: 'agent_file', name: 'agent_graph.py', type: 'file' },
                          { id: 'llm_file', name: 'llm_client.py', type: 'file' },
                        ],
                      },
                      { id: 'pyproject_toml', name: 'pyproject.toml', type: 'file' },
                    ],
                  },
                  {
                    id: 'frontend',
                    name: 'frontend',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        id: 'src_pkg',
                        name: 'src',
                        type: 'folder',
                        isExpanded: false,
                        children: [
                          { id: 'app_view', name: 'App.tsx', type: 'file' },
                          { id: 'workspace_view', name: 'ChatWorkspace.tsx', type: 'file' },
                          { id: 'avatar_view', name: 'ErisAvatar.tsx', type: 'file' },
                        ],
                      },
                      { id: 'package_file', name: 'package.json', type: 'file' },
                    ],
                  },
                  {
                    id: 'tools_pkg',
                    name: 'tools',
                    type: 'folder',
                    isExpanded: false,
                    children: [
                      { id: 'yt_tool', name: 'play_youtube_song.py', type: 'file' },
                      { id: 'cmd_tool', name: 'run_command.py', type: 'file' },
                    ],
                  },
                  { id: 'readme_file', name: 'README.md', type: 'file' },
                ],
              },
            ],
          };
        } else if (isExplicitMedia) {
          templateType = 'media-player';
          const songQuery =
            mediaTool?.args?.query ||
            mediaTool?.args?.song ||
            (rawToolCalls.find((t: any) => (t.name || '').includes('play_youtube'))?.args?.query) ||
            text.replace(/^(play|listen to|hear)\s*/i, '').replace(/\s*(on youtube|song|music)?$/i, '').trim() ||
            'Sunflower Post Malone';
          const isSunflower = songQuery.toLowerCase().includes('sunflower') || songQuery.toLowerCase().includes('post malone');
          templateData = {
            tracks: [
              {
                id: '1',
                title: isSunflower ? 'Sunflower' : songQuery.slice(0, 40) || 'YouTube Music Track',
                artist: isSunflower ? 'Post Malone & Swae Lee' : 'ERIS Media Player',
                duration: '2:42',
                youtubeId: isSunflower ? 'ApXoWvfEYVU' : undefined,
              },
              { id: '2', title: 'Deep Work Synthwave', artist: 'ERIS Soundscape', duration: '4:10', youtubeId: '4xDzrJKXOOY' },
              { id: '3', title: 'Late Night Chill Beats', artist: 'Autonomous Synthetics', duration: '2:55', youtubeId: 'jfKfPfyJRdk' },
            ],
          };
        } else if (isTerminalRequest) {
          templateType = 'terminal';
          const executedCmd = termTool?.command || termTool?.args?.command || 'powershell -Command Get-Process';
          const executedOutput = termTool?.output || termTool?.result || 'Process running in sandbox (status: OK, exit_code: 0)';
          templateData = {
            title: 'ERIS Win32 Process Sandbox',
            initialLines: [
              { id: '1', text: `$ ${executedCmd}`, isCommand: true, status: 'success' },
              { id: '2', text: String(executedOutput).slice(0, 350), isCommand: false, status: 'success' },
              { id: '3', text: '$ echo Win32 Execution Verified', isCommand: true, status: 'success' },
              { id: '4', text: 'Win32 Execution Verified', isCommand: false, status: 'success' },
            ],
          };
        } else if (isSubagentsRequest) {
          templateType = 'subagent-chain';
          templateData = {
            defaultView: 'parallel',
          };
        } else if (isIosPreview) {
          templateType = 'ios-preview';
          templateData = {
            title: 'iOS Simulator Preview',
          };
        } else if (isAndroidPreview) {
          templateType = 'android-preview';
          templateData = {
            title: 'Android Device Preview',
          };
        } else if (!isEmailAction && isSafariPreview) {
          const cleanUrl = targetUrl || browserTool?.args?.url || text.trim().replace(/^\/browser\s*/, '').trim() || 'https://duckduckgo.com';
          templateType = 'safari-preview';
          templateData = {
            url: cleanUrl,
            title: isWebSearch ? `Web Browser: ${text}` : cleanUrl,
            readerContent: finalReply,
          };
        }

        if (hasStreamedChunks) {
          setIsStreaming(false);
          setStreamingText('');
          const finalReasoning =
            donePayload?.reasoning ||
            (accumulatedThoughts.length > 0 ? accumulatedThoughts.join('\n\n') : undefined);
          const finalReasoningSteps =
            donePayload?.reasoningSteps ||
            (accumulatedThoughts.length > 0
              ? accumulatedThoughts.map((t, idx) => ({ turn: idx + 1, thought: t }))
              : undefined);

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: finalReply,
            activeModel: donePayload?.model || activeModel,
            reasoning: finalReasoning,
            reasoningSteps: finalReasoningSteps,
            searches: donePayload?.searches || (accumulatedSearches.length > 0 ? accumulatedSearches : undefined),
            sources: donePayload?.sources,
            switches: donePayload?.switches || (accumulatedSwitches.length > 0 ? accumulatedSwitches : undefined),
            thoughtDuration: durationSec,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            tools: assistantTools.length > 0 ? assistantTools : undefined,
            templateType,
            templateData,
          };
          setMessages((prev) => {
            const next = [...prev, assistantMsg];
            setConversations((c) => ({ ...c, [activeChatId]: next }));
            return next;
          });
          return;
        }

        // Stream tokens smoothly to output with pure slice indexing (immune to React StrictMode updater duplication)
        const tokens = finalReply.split(/(\s+)/);
        let tokenIdx = 0;
        // Dynamically scale step so long responses stream smoothly within ~2s without stalling
        const step = Math.max(2, Math.ceil(tokens.length / 60));
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = window.setInterval(() => {
          tokenIdx = Math.min(tokens.length, tokenIdx + step);
          const progressiveText = tokens.slice(0, tokenIdx).join('');
          setStreamingText(progressiveText);

          if (tokenIdx >= tokens.length) {
            if (streamIntervalRef.current) {
              clearInterval(streamIntervalRef.current);
              streamIntervalRef.current = null;
            }
            setIsStreaming(false);
            setStreamingText('');
            const finalReasoning =
              donePayload?.reasoning ||
              (accumulatedThoughts.length > 0 ? accumulatedThoughts.join('\n\n') : undefined);
            const finalReasoningSteps =
              donePayload?.reasoningSteps ||
              (accumulatedThoughts.length > 0
                ? accumulatedThoughts.map((t, idx) => ({ turn: idx + 1, thought: t }))
                : undefined);

            const assistantMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              text: finalReply,
              activeModel: donePayload?.model || activeModel,
              reasoning: finalReasoning,
              reasoningSteps: finalReasoningSteps,
              searches: donePayload?.searches || (accumulatedSearches.length > 0 ? accumulatedSearches : undefined),
              sources: donePayload?.sources,
              switches: donePayload?.switches || (accumulatedSwitches.length > 0 ? accumulatedSwitches : undefined),
              thoughtDuration: durationSec,
              timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              tools: assistantTools.length > 0 ? assistantTools : undefined,
              templateType,
              templateData,
            };
            setMessages((prev) => {
              const next = [...prev, assistantMsg];
              setConversations((c) => ({ ...c, [activeChatId]: next }));
              return next;
            });
          }
        }, 20);
      } catch (err) {
        console.error('Streaming message error:', err);
        setIsStreaming(false);
        setActiveThinking(null);
        const fallbackMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Encountered an issue communicating with ERIS Core: ${err}`,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages((prev) => {
          const next = [...prev, fallbackMsg];
          setConversations((c) => ({ ...c, [activeChatId]: next }));
          return next;
        });
      }
    },
    [activeChatId]
  );

  const handleStopStreaming = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      setIsStreaming(false);
      setMessages((prev) => {
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: streamingText,
        };
        const next = [...prev, assistantMsg];
        setConversations((c) => ({ ...c, [activeChatId]: next }));
        return next;
      });
    }
  }, [activeChatId, streamingText]);

  // Handle Approvals
  const handleDecision = useCallback(
    (toolId: string, approved: boolean) => {
      setExecutingApprovalId(toolId);

      let targetCommand = '';
      for (const msg of messages) {
        const found = (msg.tools || []).find((t) => t.id === toolId && t.kind === 'approval') as
          | ToolApprovalItem
          | undefined;
        if (found) {
          targetCommand = found.command || found.input || found.targetApi || '';
          break;
        }
      }

      const token = sessionStatus?.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_session_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch('/api/chat/decision', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          toolId,
          approved,
          command: targetCommand,
          sessionId: `${userScopeKey}_${activeChatId}`,
          userId: userScopeKey,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setExecutingApprovalId(null);
          setMessages((prev) => {
            const updated = prev.map((m) => {
              if (!m.tools) return m;
              return {
                ...m,
                tools: m.tools.map((t) =>
                  t.kind === 'approval' && t.id === toolId
                    ? { ...t, decision: approved ? ('approved' as const) : ('denied' as const) }
                    : t
                ),
              };
            });

            if (data.reply || (data.toolCalls && data.toolCalls.length > 0)) {
              const followUpTools: ChatTool[] = (data.toolCalls || []).map((t: any, idx: number) => ({
                kind: 'output' as const,
                id: t.id || `tool-${Date.now()}-${idx}`,
                name: t.name || t.tool || 'Tool Execution',
                output: t.output || '',
                duration: t.duration || '0.05s',
              }));

              const replyText =
                data.reply ||
                (approved
                  ? `Tool execution completed successfully. Results are verified and integrated to help achieve the goal.`
                  : `Tool execution cancelled. ERIS will explore safe alternative tools to achieve the objective.`);

              const followUpMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: replyText,
                reasoning: data.reasoning,
                reasoningSteps: data.reasoningSteps,
                tools: followUpTools.length > 0 ? followUpTools : undefined,
              };
              const next = [...updated, followUpMsg];
              setConversations((c) => ({ ...c, [activeChatId]: next }));
              return next;
            }

            setConversations((c) => ({ ...c, [activeChatId]: updated }));
            return updated;
          });
        })
        .catch((err) => {
          setExecutingApprovalId(null);
          console.error('Approval execution error:', err);
        });
    },
    [activeChatId, messages]
  );

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col overflow-hidden select-none font-sans transition-colors',
        'bg-[var(--bg-workspace)] text-[var(--text-primary)]',
        className
      )}
    >
      <WorkspaceHeader
        sessionStatus={sessionStatus || undefined}
        isDarkMode={isDarkMode}
        activeModel={activeModel}
        executionMode={executionMode}
        showRightSidebar={showRightSidebar}
        isStreaming={isStreaming}
        agentState={
          isStreaming
            ? (activeThinking ? 'thinking' : 'working')
            : messages.some((m) => m.tools?.some((t) => t.kind === 'approval' && t.decision === 'pending'))
              ? 'alert'
              : 'idle'
        }
        onOpenTemplates={() => setShowTemplateGallery(true)}
        onToggleTheme={handleToggleTheme}
        onSignOut={() => {
          try {
            localStorage.removeItem('eris_show_workspace_tree');
            localStorage.removeItem('eris_show_right_sidebar');
            localStorage.removeItem('eris_is_sidebar_expanded');
          } catch { }
          if (onSignOut) onSignOut();
          else navigate('intro');
        }}
        onEditProfile={() => navigate('profile_setup')}
        onReturnToIntro={onReturnToIntro || (() => navigate('intro'))}
        onReturnToGreeting={onReturnToGreeting || (() => navigate('greeting'))}
        onClearChat={handleClearChat}
        onOpenModelConfig={() => setIsModelConfigOpen(true)}
        onOpenApiKeyVault={() => setIsApiKeyVaultOpen(true)}
        onOpenToolsList={() => handleSendMessage('/tools')}
        onToggleExecutionMode={handleToggleExecutionMode}
        onCheckSystemHealth={() => handleSendMessage('Check system health and subsystem status')}
        onOpenWorkflowPage={() => navigate('workflow')}
        onOpenWorkflowBuilder={() => navigate('workflow')}
        onOpenKeyboardShortcuts={() => setIsKeyboardShortcutsOpen(true)}
        onOpenOnboarding={() => navigate('onboarding')}
        onToggleSidebar={() => setShowRightSidebar(!showRightSidebar)}
        onToggleWorkflowsPanel={handleToggleConnectors}
        onOpenWorkspaceTree={handleToggleWorkspaceTree}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenLegalTerms={() => {
          setIsFirstRunConsent(false);
          setIsLegalModalOpen(true);
        }}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar
          isDarkMode={isDarkMode}
          isSidebarExpanded={isSidebarExpanded}
          setIsSidebarExpanded={setIsSidebarExpanded}
          showWorkspaceTree={showWorkspaceTree}
          onToggleWorkspaceTree={handleToggleWorkspaceTree}
          showRightSidebar={showRightSidebar}
          rightSidebarTab={rightSidebarTab}
          onToggleConnectors={handleToggleConnectors}
          onToggleTools={handleToggleTools}
          onOpenModelMatrix={() => setIsModelConfigOpen(true)}
          onOpenWorkflowPage={() => navigate('workflow')}
          chatHistory={chatSessions}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onScrollToLatest={handleScrollToLatest}
          onDeleteChat={handleDeleteChat}
          width={leftSidebarWidth}
        />

        {isSidebarExpanded && (
          <ResizeHandle onDrag={handleResizeLeft} isDarkMode={isDarkMode} />
        )}

        {showWorkspaceTree && (
          <>
            <WorkspaceTreePanel
              isDarkMode={isDarkMode}
              isOpen={showWorkspaceTree}
              onClose={() => setShowWorkspaceTree(false)}
              onSelectFile={(node) => setPreviewFile({ path: node.id, name: node.name })}
              width={workspaceTreeWidth}
            />
            <ResizeHandle onDrag={handleResizeTree} isDarkMode={isDarkMode} />
          </>
        )}

        {/* Central Chat Column with Continuous Seamless Dot Pattern */}
        <div
          className={cn(
            'flex-1 flex flex-col min-w-0 relative h-full bg-transparent'
          )}
        >
          {/* Continuous Canvas Dot Pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: isDarkMode
                ? 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)'
                : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              opacity: isDarkMode ? 0.35 : 0.5,
            }}
          />

          <ChatCanvas
            messages={messages}
            isStreaming={isStreaming}
            streamingText={streamingText}
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            activeThinking={activeThinking}
            executingApprovalId={executingApprovalId}
            onSendMessage={handleSendMessage}
            onDecision={handleDecision}
            onOpenFlow={() => { }}
            onOpenWorkflowBuilder={() => navigate('workflow')}
            onOpenModelConfig={() => setIsModelConfigOpen(true)}
            scrollRef={chatScrollRef}
            activeModel={activeModel}
          />
          <ChatInputBar
            isDarkMode={isDarkMode}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onOpenBrowser={handleOpenBrowser}
            conversationMessages={messages}
          />
        </div>

        {showRightSidebar ? (
          <>
            <ResizeHandle onDrag={handleResizeRight} isDarkMode={isDarkMode} />
            <RightSidebar
              isDarkMode={isDarkMode}
              showRightSidebar={showRightSidebar}
              connectors={connectors}
              plugins={plugins}
              onToggleConnector={handleToggleConnector}
              onTogglePlugin={handleTogglePlugin}
              onConfigurePlugin={(p) => setActivePluginToConfig(p)}
              onClose={() => setShowRightSidebar(false)}
              onOpen={() => setShowRightSidebar(true)}
              activeTab={rightSidebarTab}
              onTabChange={setRightSidebarTab}
              onOpenModelConfig={() => setIsModelConfigOpen(true)}
              width={rightSidebarWidth}
              tools={tools}
            />
          </>
        ) : (
          /* Persistent Restore Tab when Sidebar is collapsed - guaranteed to bring it back */
          <button
            type="button"
            onClick={() => setShowRightSidebar(true)}
            title="Open Plugins & Tools Panel (Ctrl+B)"
            aria-label="Open Plugins & Tools Panel"
            className={cn(
              'fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-l-xl border-y border-l shadow-xl transition-all cursor-pointer group',
              isDarkMode
                ? 'bg-[#0C0F17]/95 border-white/20 text-neutral-300 hover:text-white hover:bg-[#161C2A] hover:border-blue-500/50'
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-blue-400'
            )}
          >
            <PanelRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold tracking-wider opacity-75 group-hover:opacity-100">
              PANEL
            </span>
          </button>
        )}
      </div>

      <KeyboardShortcutsModal
        isDarkMode={isDarkMode}
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />

      <ModelConfigModal
        isOpen={isModelConfigOpen}
        onClose={() => setIsModelConfigOpen(false)}
        isDarkMode={isDarkMode}
        onModelSelected={(modelId) => {
          setActiveModel(modelId);
        }}
        onOpenApiKeyVault={() => {
          setIsModelConfigOpen(false);
          setIsApiKeyVaultOpen(true);
        }}
      />

      <ApiKeyVaultModal
        isOpen={isApiKeyVaultOpen}
        onClose={() => setIsApiKeyVaultOpen(false)}
        isDarkMode={isDarkMode}
      />

      <PluginConfigModal
        plugin={activePluginToConfig}
        isOpen={Boolean(activePluginToConfig)}
        isDarkMode={isDarkMode}
        onClose={() => setActivePluginToConfig(null)}
        onSaveConfig={handleSavePluginConfig}
      />

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        filePath={previewFile?.path || null}
        fileName={previewFile?.name}
        isDarkMode={isDarkMode}
        onClose={() => setPreviewFile(null)}
        onAskChatAboutFile={(prompt) => handleSendMessage(prompt)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        isDarkMode={isDarkMode}
        plugins={plugins}
        tools={tools}
        activeModel={activeModel}
        executionMode={executionMode}
        onSelectModel={(modelId) => selectWorkspaceModel(modelId, setActiveModel)}
        onToggleExecutionMode={handleToggleExecutionMode}
        onToggleTheme={handleToggleTheme}
        onClearChat={() => clearActiveConversation(activeChatId, setMessages, setConversations)}
        onOpenWorkflowStudio={() => navigate('workflow')}
        onOpenSystemHealth={() => handleSendMessage('Check system health and status')}
        onConfigurePlugin={(p) => setActivePluginToConfig(p)}
        onSelectTab={(tab) => activateSidebarTab(tab, setShowRightSidebar, setRightSidebarTab)}
      />

      <LegalTermsModal
        isOpen={isLegalModalOpen}
        isDarkMode={isDarkMode}
        isFirstRun={isFirstRunConsent}
        onClose={() => setIsLegalModalOpen(false)}
        onConsentAccepted={() => {
          setIsFirstRunConsent(false);
          setIsLegalModalOpen(false);
        }}
      />

      {/* Interactive UI Templates Gallery Showcase Modal */}
      {showTemplateGallery && (
        <TemplateGallery onClose={() => setShowTemplateGallery(false)} />
      )}

      {/* Reserved Clean Isolation Container for Future Emotion Wheel */}
      <div
        id="eris-emotion-wheel-anchor"
        className="fixed bottom-4 right-4 pointer-events-none z-30"
        aria-label="Emotion Wheel Zone"
      />
    </div>
  );
};

export default ChatWorkspace;
