import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Search, Palette, Check, Sparkles, LayoutTemplate, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SessionConfigStatus } from '../onboarding/authActions';
import { UserMenu } from '../auth/UserMenu';
import { AnimatedThemeTogglerTemplate } from '../../../ui_templates/AnimatedThemeTogglerTemplate';
import { UpdateCheckerNotificationTemplate } from '../../../ui_templates/UpdateCheckerNotificationTemplate';
import { Menubar } from '../navigation/Menubar';
import { useDevMode, isDevIdentityConfirmed } from '../../context/DevModeContext';
import { ErisAvatar, type AgentState } from '../ui/ErisAvatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

import {
  type ThemeTransitionOrigin,
  DARK_THEME_PRESETS,
  LIGHT_THEME_PRESETS,
  setWorkspaceThemePreset,
  getWorkspaceThemePreset,
  type ThemePreset,
} from '../../lib/workspaceActions';

export interface WorkspaceHeaderProps {
  sessionStatus?: SessionConfigStatus;
  isDarkMode: boolean;
  activeModel?: string;
  executionMode?: 'speed' | 'accuracy';
  showRightSidebar?: boolean;
  isStreaming?: boolean;
  agentState?: AgentState;
  onOpenTemplates?: () => void;
  onToggleTheme: (origin?: ThemeTransitionOrigin) => void;
  onSignOut: () => void;
  onEditProfile?: () => void;
  onClearChat: () => void;
  onOpenModelConfig: () => void;
  onOpenToolsList: () => void;
  onToggleExecutionMode: () => void;
  onCheckSystemHealth: () => void;
  onOpenWorkflowBuilder: () => void;
  onOpenWorkflowPage?: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenOnboarding?: () => void;
  onToggleSidebar?: () => void;
  onToggleWorkflowsPanel?: () => void;
  onOpenWorkspaceTree?: () => void;
  onReturnToIntro?: () => void;
  onReturnToGreeting?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenApiKeyVault?: () => void;
  onOpenLegalTerms?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  sessionStatus,
  isDarkMode,
  activeModel: _activeModel,
  executionMode: _executionMode = 'speed',
  showRightSidebar: _showRightSidebar = false,
  isStreaming = false,
  agentState,
  onOpenTemplates,
  onToggleTheme,
  onSignOut,
  onEditProfile,
  onClearChat,
  onOpenModelConfig,
  onOpenApiKeyVault,
  onOpenToolsList,
  onToggleExecutionMode,
  onCheckSystemHealth,
  onOpenWorkflowBuilder,
  onOpenWorkflowPage,
  onOpenKeyboardShortcuts,
  onOpenOnboarding,
  onToggleSidebar,
  onToggleWorkflowsPanel,
  onOpenWorkspaceTree,
  onReturnToIntro,
  onReturnToGreeting,
  onOpenCommandPalette,
  onOpenLegalTerms,
}) => {
  const { isDevMode } = useDevMode();
  const headerScopeKey = (
    sessionStatus?.email ||
    sessionStatus?.username ||
    'local_user'
  ).toLowerCase().trim();

  const activeBio =
    sessionStatus?.profile?.bio ||
    (sessionStatus as any)?.preferences?.bio ||
    (sessionStatus as any)?.bio ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_bio_${headerScopeKey}`) : '') ||
    '';

  const isRealAman = isDevIdentityConfirmed(activeBio, isDevMode);
  const [currentPreset, setCurrentPreset] = useState<ThemePreset>(() => getWorkspaceThemePreset(isDarkMode));
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [updateInfo, setUpdateInfo] = useState<{
    update_available: boolean;
    latest_version: string;
    current_version: string;
    release_url: string;
    release_name: string;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  useEffect(() => {
    fetch('/api/system/check-update')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.update_available) {
          setUpdateInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for external preset changes or theme toggles
  useEffect(() => {
    const handlePresetChange = (e: Event) => {
      const custom = e as CustomEvent<{ preset: ThemePreset }>;
      if (custom.detail?.preset) {
        setCurrentPreset(custom.detail.preset);
      }
    };
    window.addEventListener('eris:theme-preset-changed', handlePresetChange);
    return () => window.removeEventListener('eris:theme-preset-changed', handlePresetChange);
  }, []);

  return (
    <header
      className={cn(
        'shrink-0 border-b px-4 sm:px-6 flex flex-col z-20 transition-colors',
        isDarkMode
          ? 'border-white/[0.08] bg-[var(--bg-surface)] backdrop-blur-xl'
          : 'border-slate-200 bg-[var(--bg-surface)] shadow-2xs'
      )}
    >
      <div className="h-14 flex items-center justify-between gap-4 relative">
        {/* Brand & ERIS State-Aware Avatar */}
        <div className="flex items-center gap-3 shrink-0 z-20">
          <ErisAvatar size="sm" isThinking={isStreaming} state={agentState || (isStreaming ? 'thinking' : 'idle')} />
          <span className={cn('text-xs font-bold tracking-wider font-mono uppercase', isDarkMode ? 'text-white' : 'text-slate-900')}>
            ERIS
          </span>
          <span className={cn('text-xs opacity-40 font-mono')}>/</span>
          <span className={cn('text-xs font-medium', isDarkMode ? 'text-neutral-300' : 'text-slate-600')}>
            Workspace
          </span>
        </div>

        {/* Top-Middle Perfectly Centered Universal Search / Command Palette Trigger */}
        {onOpenCommandPalette && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm sm:max-w-md lg:max-w-xl pointer-events-auto px-2 sm:px-4 z-10">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Search plugins, tools, models, settings... (Ctrl+K)"
              aria-label="Universal Search & Command Palette"
              className={cn(
                'flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs w-full',
                isDarkMode
                  ? 'border-white/12 bg-white/[0.04] text-neutral-300 hover:text-white hover:border-white/25 hover:bg-white/[0.07]'
                  : 'border-slate-300 bg-slate-50/90 text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate font-medium">Search plugins, tools, models, workflows...</span>
              </div>
              <kbd
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-mono border shrink-0 shadow-2xs',
                  isDarkMode ? 'border-white/15 bg-white/10 text-neutral-300' : 'border-slate-300 bg-white text-slate-700'
                )}
              >
                Ctrl K
              </kbd>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Workspace Settings"
                className={cn(
                  'cursor-pointer size-8 rounded-lg border flex items-center justify-center transition-colors',
                  isDarkMode
                    ? 'border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className={cn(
                'w-56 font-sans p-1.5 shadow-2xl rounded-xl z-50 border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop-blur-xl'
              )}
            >
              <DropdownMenuLabel
                className="text-xs font-semibold px-2.5 py-1.5 text-[var(--text-secondary)]"
              >
                Workspace Settings
              </DropdownMenuLabel>
              <DropdownMenuSeparator
                className="bg-[var(--border-workspace)]"
              />
              <DropdownMenuItem
                onClick={onOpenModelConfig}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                Model Configuration
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenWorkflowPage || onOpenWorkflowBuilder}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                Workflow Studio <span className="ml-1 text-[10px] text-amber-500 font-normal">(in-development)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleExecutionMode}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                Execution Mode
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenToolsList}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                View Registered Tools
              </DropdownMenuItem>
              {onOpenTemplates && (
                <DropdownMenuItem
                  onClick={onOpenTemplates}
                  className={cn(
                    'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-indigo-400 hover:bg-indigo-500/10'
                  )}
                >
                  <LayoutTemplate className="w-3.5 h-3.5 mr-2" />
                  UI Templates Gallery
                </DropdownMenuItem>
              )}
              {onOpenApiKeyVault && (
                <DropdownMenuItem
                  onClick={onOpenApiKeyVault}
                  className={cn(
                    'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--accent-primary)] hover:bg-[var(--accent-glow)]'
                  )}
                >
                  API Key Vault
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onOpenKeyboardShortcuts}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator
                className="bg-[var(--border-workspace)]"
              />
              <DropdownMenuItem
                onClick={onCheckSystemHealth}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                System Health
              </DropdownMenuItem>
              {isDevMode && isRealAman && onOpenOnboarding && (
                <>
                  <DropdownMenuSeparator
                    className="bg-[var(--border-workspace)]"
                  />
                  <DropdownMenuItem
                    onClick={onOpenOnboarding}
                    className={cn(
                      'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-emerald-500 hover:bg-emerald-500/10'
                    )}
                  >
                    Launch Onboarding (Dev)
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Update Available Notification Pill (triggers notification popover) */}
          {updateInfo && updateInfo.update_available && (
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              title={`ERIS v${updateInfo.latest_version} is available! Click to inspect and update.`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all shadow-xs animate-pulse hover:animate-none cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Update v{updateInfo.latest_version}</span>
            </button>
          )}

          {/* Dashboard Notification Section (UntitledUI Update Checker Popover) */}
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              title="System Notifications & Update Checker"
              aria-label="System Notifications & Updates"
              className={cn(
                'cursor-pointer relative size-8 rounded-lg border flex items-center justify-center transition-colors shadow-2xs',
                isNotificationOpen
                  ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-400'
                  : isDarkMode
                  ? 'border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Bell className="w-4 h-4" />
              {updateInfo?.update_available && (
                <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-indigo-500 ring-2 ring-neutral-900 animate-pulse" />
              )}
            </button>

            {/* UntitledUI Update Checker Popover Card */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 z-50 w-96 animate-in fade-in-50 zoom-in-95 duration-150 shadow-2xl">
                <UpdateCheckerNotificationTemplate
                  compact={true}
                  isDarkMode={isDarkMode}
                  onDismiss={() => setIsNotificationOpen(false)}
                  className="shadow-2xl border-white/15 bg-neutral-900/98 backdrop-blur-2xl"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenWorkflowPage || onOpenWorkflowBuilder}
            title="Open Workflow Studio (In Development)"
            className={cn(
              'cursor-pointer inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-xs transition-colors',
              isDarkMode
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            )}
          >
            <span>Workflows</span>
            <span className="text-[10px] opacity-75 font-normal tracking-tight">(in-development)</span>
          </button>

          {/* Preset Theme Switcher (5 Dark / 5 Light) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={`Theme Preset: ${currentPreset}`}
                aria-label="Change Theme Preset"
                className={cn(
                  'cursor-pointer size-8 rounded-lg border flex items-center justify-center transition-colors shadow-2xs',
                  isDarkMode
                    ? 'border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Palette className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className={cn(
                'w-56 font-sans p-1.5 shadow-2xl rounded-xl z-50 border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop-blur-xl'
              )}
            >
              <DropdownMenuLabel
                className="text-xs font-semibold px-2.5 py-1.5 flex items-center justify-between text-[var(--text-secondary)]"
              >
                <span>{isDarkMode ? 'Dark Presets (5)' : 'Light Presets (5)'}</span>
                <span className="text-[10px] font-mono opacity-75">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[var(--border-workspace)]" />
              {(isDarkMode ? DARK_THEME_PRESETS : LIGHT_THEME_PRESETS).map((preset) => {
                const isSelected = currentPreset === preset.id;
                return (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => {
                      setWorkspaceThemePreset(preset.id);
                      setCurrentPreset(preset.id);
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between text-[var(--text-primary)]',
                      isSelected
                        ? 'bg-black/10 dark:bg-white/10 font-bold'
                        : 'hover:bg-black/5 dark:hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-3 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/25 shadow-xs"
                        style={{ backgroundColor: preset.badgeColor }}
                      />
                      <span className="truncate">{preset.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-2" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <AnimatedThemeTogglerTemplate
            isDarkMode={isDarkMode}
            onToggle={onToggleTheme}
          />

          <UserMenu
            sessionStatus={sessionStatus}
            isDarkMode={isDarkMode}
            onToggleDarkMode={undefined}
            onEditProfile={onEditProfile}
            onOpenApiKeyVault={onOpenApiKeyVault}
            onReturnToIntro={onReturnToIntro}
            onSignOut={onSignOut}
            onOpenSystemHealth={onCheckSystemHealth}
          />
        </div>
      </div>

      <div className="pb-1.5 pt-0.5 border-t border-white/[0.06] dark:border-white/[0.06] border-slate-100">
        <Menubar
          isDarkMode={isDarkMode}
          actions={{
            onNewChat: onClearChat,
            onOpenWorkflowBuilder: onOpenWorkflowBuilder,
            onOpenWorkflowPage: onOpenWorkflowPage || onOpenWorkflowBuilder,
            onOpenOnboarding,
            onClearChat,
            onToggleTheme,
            onToggleSidebar: onToggleSidebar || (() => {}),
            onToggleWorkflowsPanel,
            onCheckSystemHealth,
            onOpenModelConfig,
            onOpenApiKeyVault,
            onOpenToolsList,
            onToggleExecutionMode,
            onOpenKeyboardShortcuts,
            onOpenWorkspaceTree: onOpenWorkspaceTree || (() => {}),
            onReturnToIntro,
            onReturnToGreeting,
            onOpenHelpDocs: () => window.open('https://github.com/EzioAman/Eris', '_blank'),
            onOpenLegalTerms,
            onSignOut,
          }}
        />
      </div>
    </header>
  );
};
