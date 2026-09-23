/**
 * Centralized Workspace Actions Hub
 * Consolidates core functions across the entire application into single canonical implementations.
 * Any component (Search Bar / Command Palette, Topbar, Menubar, Shortcuts) can import and call
 * these exact functions, ensuring 100% synchronized behavior and zero duplication.
 */

import React from 'react';

export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

/**
 * Executes a circular radial view transition for theme changes.
 * Defaults to topbar center if no origin coordinates are provided.
 */
export const executeThemeTransition = (
  onToggle: () => void,
  origin?: ThemeTransitionOrigin
): void => {
  if (typeof document === 'undefined') {
    onToggle();
    return;
  }

  // Fallback for browsers lacking document.startViewTransition
  if (!('startViewTransition' in document)) {
    onToggle();
    return;
  }

  const x = origin ? origin.x : window.innerWidth / 2;
  const y = origin ? origin.y : 28;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = (document as any).startViewTransition(() => {
    onToggle();
  });

  transition.ready?.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    document.documentElement.animate(
      { clipPath },
      {
        duration: 450,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  }).catch(() => {
    onToggle();
  });
};

/**
 * Canonical Theme Toggle:
 * Runs the circular view transition and synchronizes localStorage + classList.
 */
export const toggleWorkspaceTheme = (
  _currentIsDark: boolean,
  setIsDark: React.Dispatch<React.SetStateAction<boolean>>,
  origin?: ThemeTransitionOrigin
): void => {
  executeThemeTransition(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('eris_theme', next ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, origin);
};

/**
 * Canonical Execution Mode Toggle:
 * Switches between 'speed' and 'accuracy', dispatches global window event, and persists to backend.
 */
export const toggleWorkspaceExecutionMode = (
  currentMode: 'speed' | 'accuracy',
  setMode: React.Dispatch<React.SetStateAction<'speed' | 'accuracy'>>
): 'speed' | 'accuracy' => {
  const nextMode = currentMode === 'speed' ? 'accuracy' : 'speed';
  setMode(nextMode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eris:mode-changed', { detail: { mode: nextMode } }));
  }
  fetch('/api/system/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: nextMode }),
  }).catch(() => { });
  return nextMode;
};

/**
 * Canonical Model Selection:
 * Updates local state, dispatches global event, and persists to backend memory.
 */
export const selectWorkspaceModel = (
  modelId: string,
  setModel: React.Dispatch<React.SetStateAction<string>>
): void => {
  setModel(modelId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eris:model-changed', { detail: { modelId } }));
  }
  fetch('/api/system/models/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId }),
  }).catch(() => { });
};

/**
 * Canonical Clear Chat:
 * Empties current conversation messages while preserving session structure.
 */
export const clearActiveConversation = (
  activeChatId: string,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  setConversations: React.Dispatch<React.SetStateAction<Record<string, any[]>>>
): void => {
  setMessages([]);
  setConversations((prev) => ({ ...prev, [activeChatId]: [] }));
  try {
    const raw = localStorage.getItem('eris_chat_conversations');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed[activeChatId] = [];
      localStorage.setItem('eris_chat_conversations', JSON.stringify(parsed));
    }
  } catch { }
};

/**
 * Canonical Tab Activator:
 * Opens the Right Sidebar directly on the specified tab ('plugins' | 'tools' | 'connectors').
 */
export const activateSidebarTab = (
  tab: 'plugins' | 'tools' | 'connectors',
  setShowRightSidebar: React.Dispatch<React.SetStateAction<boolean>>,
  setRightSidebarTab: React.Dispatch<React.SetStateAction<'plugins' | 'tools' | 'connectors'>>
): void => {
  setShowRightSidebar(true);
  setRightSidebarTab(tab);
};

export type DarkThemePreset = 'obsidian' | 'midnight' | 'emerald' | 'crimson' | 'monochrome';
export type LightThemePreset = 'studio' | 'nordic' | 'editorial' | 'botanical' | 'lavender';
export type ThemePreset = DarkThemePreset | LightThemePreset;

export interface ThemePresetOption {
  id: ThemePreset;
  label: string;
  badgeColor: string;
  description: string;
}

export const DARK_THEME_PRESETS: ThemePresetOption[] = [
  { id: 'obsidian', label: 'Obsidian Void', badgeColor: '#8B5CF6', description: 'Deep obsidian void with electric violet accents' },
  { id: 'midnight', label: 'Midnight Cyan', badgeColor: '#0EA5E9', description: 'Abyssal deep navy with cyber cyan glow' },
  { id: 'emerald', label: 'Deep Jade', badgeColor: '#10B981', description: 'Matrix forest dark with cyber mint highlights' },
  { id: 'crimson', label: 'Velvet Wine', badgeColor: '#F43F5E', description: 'Synthwave charcoal with ruby rose glow' },
  { id: 'monochrome', label: 'Monochrome Slate', badgeColor: '#E4E4E7', description: 'Pure studio charcoal with high-contrast silver' },
];

export const LIGHT_THEME_PRESETS: ThemePresetOption[] = [
  { id: 'studio', label: 'Pure Studio', badgeColor: '#6366F1', description: 'Porcelain white with vibrant indigo accents' },
  { id: 'nordic', label: 'Nordic Frost', badgeColor: '#0284C7', description: 'Glacier ice white with crisp sky cyan accents' },
  { id: 'editorial', label: 'Warm Editorial', badgeColor: '#D97706', description: 'Claude bookish cream paper with amber clay' },
  { id: 'botanical', label: 'Botanical Mint', badgeColor: '#059669', description: 'Fresh calm sage white with forest emerald' },
  { id: 'lavender', label: 'Lilac Quartz', badgeColor: '#7C3AED', description: 'Pastel lilac white with royal violet accents' },
];

export const setWorkspaceThemePreset = (preset: ThemePreset): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme-preset', preset);
    try {
      localStorage.setItem('eris_theme_preset', preset);
    } catch { }
    window.dispatchEvent(new CustomEvent('eris:theme-preset-changed', { detail: { preset } }));
  }
};

export const getWorkspaceThemePreset = (isDarkMode?: boolean): ThemePreset => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('eris_theme_preset') as ThemePreset | null;
    if (stored) return stored;
  }
  return isDarkMode ? 'obsidian' : 'studio';
};

// Backward compatibility aliases
export type AccentColor = ThemePreset;
export const setWorkspaceAccent = setWorkspaceThemePreset;
export const getWorkspaceAccent = getWorkspaceThemePreset;

// Self-initialize on DOM ready
if (typeof document !== 'undefined') {
  const isDark = document.documentElement.classList.contains('dark') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('eris_theme') === 'dark');
  const initialPreset = getWorkspaceThemePreset(isDark);
  document.documentElement.setAttribute('data-theme-preset', initialPreset);
}
