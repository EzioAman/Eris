import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import {
  Sparkles,
  Command,
  FileText,
  Workflow,
  Cpu,
  Shield,
  HelpCircle,
  LogOut,
  RotateCcw,
  Palette,
  PanelRight,
  FolderTree,
  Activity,
  Terminal,
  KeyRound,
} from 'lucide-react';

export interface MenubarActionCallbacks {
  onNewChat?: () => void;
  onOpenWorkflowBuilder?: () => void;
  onOpenWorkflowPage?: () => void;
  onOpenWorkflowWindow?: () => void;
  onClearChat?: () => void;
  onToggleTheme?: () => void;
  onToggleSidebar?: () => void;
  onToggleWorkflowsPanel?: () => void;
  onCheckSystemHealth?: () => void;
  onOpenModelConfig?: () => void;
  onOpenApiKeyVault?: () => void;
  onOpenToolsList?: () => void;
  onToggleExecutionMode?: () => void;
  onOpenWorkspaceTree?: () => void;
  onOpenHelpDocs?: () => void;
  onOpenLegalTerms?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onReturnToIntro?: () => void;
  onReturnToGreeting?: () => void;
  onOpenOnboarding?: () => void;
  onSignOut?: () => void;
}

export interface MenubarProps {
  isDarkMode?: boolean;
  actions: MenubarActionCallbacks;
  className?: string;
}

interface MenuItemDef {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  destructive?: boolean;
  badge?: string;
}

interface MenuDef {
  title: string;
  items: MenuItemDef[];
}

export const Menubar: React.FC<MenubarProps> = ({
  isDarkMode: _isDarkMode = true,
  actions,
  className,
}) => {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    if (openMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuIndex]);

  const menus: MenuDef[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'New Chat Session', icon: Sparkles, shortcut: 'Ctrl+N', action: actions.onNewChat },
        { label: 'Visual Workflow Studio (in-development)', icon: Workflow, shortcut: 'Ctrl+Shift+W', action: actions.onOpenWorkflowPage || actions.onOpenWorkflowBuilder },
        { label: 'Switch AI Model', icon: Cpu, shortcut: 'Ctrl+2', action: actions.onOpenModelConfig },
        ...(actions.onOpenApiKeyVault ? [{ label: 'API Key Vault', icon: KeyRound, action: actions.onOpenApiKeyVault }] : []),
        ...(actions.onOpenOnboarding ? [{ label: 'Diagnostics & Onboarding (Dev)', icon: Shield, action: actions.onOpenOnboarding }] : []),
        { label: '', separator: true },
        { label: 'Return to Hub', icon: Command, shortcut: 'Ctrl+H', action: actions.onReturnToIntro },
        { label: 'Greeting Dashboard', icon: Activity, action: actions.onReturnToGreeting },
        { label: '', separator: true },
        { label: 'Close Workspace Session', icon: LogOut, action: actions.onSignOut, destructive: true },
      ],
    },
    {
      title: 'Edit',
      items: [
        {
          label: 'Undo Action',
          shortcut: 'Ctrl+Z',
          action: () => document.execCommand?.('undo'),
        },
        {
          label: 'Redo Action',
          shortcut: 'Ctrl+Y',
          action: () => document.execCommand?.('redo'),
        },
        { label: '', separator: true },
        { label: 'Clear Active Conversation', icon: RotateCcw, action: actions.onClearChat },
      ],
    },
    {
      title: 'View',
      items: [
        {
          label: 'Switch Theme Mode & Presets',
          icon: Palette,
          shortcut: 'Ctrl+D',
          action: actions.onToggleTheme,
        },
        {
          label: 'Toggle Workspace File Tree',
          icon: FolderTree,
          shortcut: 'Ctrl+Shift+E',
          action: actions.onOpenWorkspaceTree,
        },
        {
          label: 'Toggle Inspector & Tools Panel',
          icon: PanelRight,
          shortcut: 'Ctrl+B',
          action: actions.onToggleSidebar,
        },
        { label: '', separator: true },
        {
          label: 'System Health Diagnostics',
          icon: Activity,
          action: actions.onCheckSystemHealth || (() => {
            fetch('/api/system/health').catch(() => {});
          }),
        },
      ],
    },
    {
      title: 'Agent',
      items: [
        {
          label: 'Execution Profile (Speed / Accuracy)',
          icon: Shield,
          action: actions.onToggleExecutionMode,
        },
        {
          label: 'Verified Capabilities & Tools (/tools)',
          icon: Terminal,
          action: actions.onOpenToolsList,
        },
        {
          label: 'Workflow Canvas Graph',
          icon: Workflow,
          shortcut: 'Ctrl+Shift+W',
          action: actions.onOpenWorkflowPage || actions.onOpenWorkflowBuilder,
        },
        { label: '', separator: true },
        {
          label: 'Choose Foundation Model...',
          icon: Cpu,
          shortcut: 'Ctrl+2',
          action: actions.onOpenModelConfig,
        },
        {
          label: 'Verify Workspace AST Guardrails',
          icon: Shield,
          action: actions.onCheckSystemHealth,
        },
      ],
    },
    {
      title: 'Help',
      items: [
        { label: 'Documentation & Guide', icon: FileText, action: actions.onOpenHelpDocs },
        { label: 'Keyboard Shortcuts Reference', icon: Command, shortcut: '?', action: actions.onOpenKeyboardShortcuts },
        { label: 'Privacy Policy & Terms of Service', icon: Shield, action: actions.onOpenLegalTerms },
        { label: '', separator: true },
        {
          label: 'Source & Release Notes',
          icon: HelpCircle,
          action: () => {
            window.open('https://github.com/EzioAman/Eris', '_blank');
          },
        },
      ],
    },
  ];

  return (
    <nav
      ref={containerRef}
      role="menubar"
      aria-label="Application Menu"
      className={cn(
        'relative flex items-center h-7 px-1 rounded-md text-xs font-sans select-none z-30',
        'text-[var(--text-secondary)]',
        className
      )}
    >
      {menus.map((menu, idx) => {
        const isOpen = openMenuIndex === idx;

        return (
          <div key={menu.title} className="relative">
            <button
              type="button"
              onClick={() => setOpenMenuIndex(isOpen ? null : idx)}
              onMouseEnter={() => {
                if (openMenuIndex !== null) setOpenMenuIndex(idx);
              }}
              className={cn(
                'cursor-pointer px-2.5 py-1 rounded-md text-xs font-medium transition-colors outline-none',
                isOpen
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
              )}
            >
              {menu.title}
            </button>

            {/* Polished Command Dropdown Menu */}
            {isOpen && (
              <div
                className={cn(
                  'absolute left-0 top-full mt-1 min-w-[220px] rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in-80 duration-100',
                  'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                )}
              >
                {menu.items.map((item, iIdx) => {
                  if (item.separator) {
                    return (
                      <div
                        key={`sep-${iIdx}`}
                        className="my-1 h-px bg-[var(--border-workspace)] opacity-60"
                      />
                    );
                  }

                  const ItemIcon = item.icon;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        item.action?.();
                        setOpenMenuIndex(null);
                      }}
                      className={cn(
                        'cursor-pointer w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition-colors outline-none group',
                        item.destructive
                          ? 'text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                          : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {ItemIcon && (
                          <ItemIcon className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-workspace)] bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Menubar;
