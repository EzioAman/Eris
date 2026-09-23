import React, { useState, useRef, useEffect } from 'react';
import { ErisIntro } from './components/intro/ErisIntro';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { GreetingPage } from './components/greeting/GreetingPage';
import { checkSessionAndConfig, resolveOnboardingLifecycleState, type SessionConfigStatus } from './components/onboarding/authActions';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { KeyboardShortcutProvider } from './context/KeyboardShortcutManager';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSeparator,
} from './components/ui/context-menu';
import { DevDataViewer } from './components/dev/DevDataViewer';
import { DevModeProvider, useDevMode } from './context/DevModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { LearningWorkflowStudio } from './components/workflow/LearningWorkflowStudio';
import { SkeletonTemplate } from '../ui_templates/SkeletonTemplate';
import { ProfileSettingsTemplate, type ProfileState } from '../ui_templates/ProfileSettingsTemplate';
import { RotateCcw, Copy, Scissors, ClipboardPaste, Trash2, Plus, Database } from 'lucide-react';
import { preloadOnboardingAssets } from './lib/assetPreload';
import { BlurVignette, BlurVignetteArticle } from './components/ui/blur-vignette';
import { ApiKeyVaultModal } from './components/settings/ApiKeyVaultModal';
import { ModelConfigModal } from './components/workspace/ModelConfigModal';
import { isDevIdentityConfirmed } from './context/DevModeContext';
import erisThinkingSvg from './assets/eris_thinking.svg';

const GreetingWithTransition: React.FC<{
  sessionStatus?: SessionConfigStatus;
  isDevMode?: boolean;
  onEnterWorkspace: () => void;
  onOpenOnboarding?: () => void;
  onReturnToIntro?: () => void;
  onSignOut?: () => void;
}> = (props) => {
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    // Show loading state briefly, then crossfade to greeting
    const timer = setTimeout(() => {
      setShowGreeting(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-screen min-h-screen overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {!showGreeting ? (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center font-sans bg-black [will-change:opacity]"
          >
            <div className="size-20 mb-4 flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(255,217,160,0.35)]">
              <img
                src={erisThinkingSvg}
                alt="ERIS"
                onError={(e) => {
                  if (e.currentTarget.src !== '/assets/eris_thinking.svg') {
                    e.currentTarget.src = '/assets/eris_thinking.svg';
                  }
                }}
                className="w-full h-full object-contain animate-pulse"
              />
            </div>
            <p className="font-sans text-sm font-medium text-neutral-300 tracking-normal">
              Please wait
            </p>
            <SkeletonTemplate className="mt-3 h-1 w-28 rounded-full bg-white/20" />
          </motion.div>
        ) : (
          <motion.div
            key="greeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-10"
          >
            <GreetingPage {...props} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { current, navigate, goBack, canGoBack, reload, reloadKey } = useAppState();
  const [activeSession, setActiveSession] = useState<SessionConfigStatus | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [setupStep, setSetupStep] = useState<'keys' | 'model'>('keys');
  const lastTargetRef = useRef<HTMLElement | null>(null);

  // Hydrate session from local database / backend on mount and precache assets
  useEffect(() => {
    preloadOnboardingAssets();
    checkSessionAndConfig().then((status) => {
      if (status.isAuthenticated) {
        setActiveSession(status);
      }
    });
  }, []);

  const [contextInfo, setContextInfo] = useState<{
    isChat: boolean;
    chatId?: string;
    chatTitle?: string;
    isInput: boolean;
    hasSelection: boolean;
    isWorkspace: boolean;
  }>({
    isChat: false,
    isInput: false,
    hasSelection: false,
    isWorkspace: false,
  });

  // Global Context Menu Cut Handler
  const handleCut = async () => {
    try {
      const activeEl = (lastTargetRef.current || document.activeElement) as HTMLInputElement | HTMLTextAreaElement | null;
      if (activeEl && 'value' in activeEl) {
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? activeEl.value.length;
        const selected = activeEl.value.substring(start, end);
        if (selected) {
          await navigator.clipboard.writeText(selected);
          const nextVal = activeEl.value.slice(0, start) + activeEl.value.slice(end);
          activeEl.value = nextVal;
          activeEl.selectionStart = activeEl.selectionEnd = start;
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
          activeEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } catch (err) {
      console.warn('Cut failed:', err);
    }
  };

  // Global Context Menu Copy Handler
  const handleCopy = async () => {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        await navigator.clipboard.writeText(selection);
        return;
      }
      const activeEl = (lastTargetRef.current || document.activeElement) as HTMLInputElement | HTMLTextAreaElement | null;
      if (activeEl && 'value' in activeEl) {
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? activeEl.value.length;
        const selected = activeEl.value.substring(start, end);
        if (selected) {
          await navigator.clipboard.writeText(selected);
        } else if (activeEl.value) {
          await navigator.clipboard.writeText(activeEl.value);
        }
      }
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Global Context Menu Paste Handler
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      let target = (lastTargetRef.current || document.activeElement) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !('value' in target) || typeof target.focus !== 'function') {
        target = document.querySelector('textarea:focus, input:focus, textarea, input[type="text"]') as HTMLInputElement | HTMLTextAreaElement | null;
      }

      if (target && 'value' in target && typeof target.focus === 'function') {
        target.focus();
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
        const val = target.value || '';
        const nextVal = val.slice(0, start) + text + val.slice(end);

        const isTextArea = target instanceof HTMLTextAreaElement;
        const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(target, nextVal);
        } else {
          target.value = nextVal;
        }

        target.selectionStart = target.selectionEnd = start + text.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }

      window.dispatchEvent(new CustomEvent('eris:paste', { detail: text }));
    } catch (err) {
      console.warn('Paste failed:', err);
    }
  };

  const handleDeleteChat = () => {
    if (contextInfo.chatId) {
      window.dispatchEvent(
        new CustomEvent('eris:delete-chat', {
          detail: { chatId: contextInfo.chatId },
        })
      );
    }
  };

  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent('eris:new-chat'));
  };

  const { isDevMode, setDevMode } = useDevMode();

  const handleSignOut = () => {
    try {
      localStorage.removeItem('eris_session');
    } catch {
      // ignore
    }
    setActiveSession(null);
    navigate('intro', { replace: true, clearHistory: true });
  };

  // Intercept after sign-in: Route deterministically through onboarding lifecycle state machine
  const handleSessionEstablished = (session: SessionConfigStatus | null | undefined, isDev?: boolean) => {
    if (session && session.isAuthenticated) {
      setActiveSession(session);
      if (typeof isDev === 'boolean') {
        setDevMode(isDev);
      }
      const targetScreen = resolveOnboardingLifecycleState(session, 'greeting');
      navigate(targetScreen);
    } else {
      navigate('intro');
    }
  };

  const handleSaveProfile = async (profileState: ProfileState) => {
    try {
      const accountScopeKey = (
        activeSession?.email ||
        profileState.email ||
        activeSession?.username ||
        profileState.username ||
        'local_user'
      ).toLowerCase().trim();

      try {
        localStorage.setItem(`eris_profile_${accountScopeKey}`, JSON.stringify(profileState));
        if (profileState.bio) {
          localStorage.setItem(`eris_user_bio_${accountScopeKey}`, profileState.bio);
          localStorage.setItem('eris_user_bio', profileState.bio);
        } else {
          localStorage.removeItem(`eris_user_bio_${accountScopeKey}`);
        }
        if (profileState.displayName) {
          localStorage.setItem(`eris_user_display_name_${accountScopeKey}`, profileState.displayName);
          localStorage.setItem('eris_user_display_name', profileState.displayName);
        }
        if (profileState.avatarUrl) {
          localStorage.setItem(`eris_user_avatar_${accountScopeKey}`, profileState.avatarUrl);
          localStorage.setItem('eris_user_avatar', profileState.avatarUrl);
        } else {
          localStorage.removeItem(`eris_user_avatar_${accountScopeKey}`);
          localStorage.removeItem('eris_user_avatar');
        }
        if (profileState.username) {
          localStorage.setItem(`eris_username_${accountScopeKey}`, profileState.username);
          localStorage.setItem('eris_username', profileState.username);
        }
        if (profileState.headline) localStorage.setItem(`eris_user_headline_${accountScopeKey}`, profileState.headline);
        if (profileState.email) localStorage.setItem(`eris_user_email_${accountScopeKey}`, profileState.email);
        if (profileState.website) localStorage.setItem(`eris_user_website_${accountScopeKey}`, profileState.website);
        if (profileState.timezone) localStorage.setItem(`eris_user_timezone_${accountScopeKey}`, profileState.timezone);
        if (profileState.accent) localStorage.setItem(`eris_user_accent_${accountScopeKey}`, profileState.accent);
      } catch {
        // ignore localStorage quota errors
      }

      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeSession?.token ? { Authorization: `Bearer ${activeSession.token}` } : {})
        },
        body: JSON.stringify({
          display_name: profileState.displayName,
          username: profileState.username,
          avatar_url: profileState.avatarUrl || null,
          headline: profileState.headline || null,
          bio: profileState.bio || null,
          email: profileState.email || activeSession?.email || '',
          website: profileState.website || null,
          timezone: profileState.timezone || 'Asia/Kolkata',
          visibility: profileState.visibility || 'members',
          accent: profileState.accent || 'indigo',
          notify_product: profileState.notifyProduct,
          notify_mentions: profileState.notifyMentions,
          notify_digest: profileState.notifyDigest,
        })
      });

      setActiveSession((prev) => ({
        ...(prev || { isAuthenticated: true, isConfigured: true }),
        displayName: profileState.displayName,
        username: profileState.username,
        avatarUrl: profileState.avatarUrl,
        profile: {
          ...(prev?.profile || {}),
          displayName: profileState.displayName,
          display_name: profileState.displayName,
          username: profileState.username,
          avatarUrl: profileState.avatarUrl,
          avatar_url: profileState.avatarUrl,
          headline: profileState.headline,
          bio: profileState.bio,
          email: profileState.email,
          website: profileState.website,
          timezone: profileState.timezone,
          visibility: profileState.visibility,
          accent: profileState.accent,
          notifyProduct: profileState.notifyProduct,
          notify_product: profileState.notifyProduct,
          notifyMentions: profileState.notifyMentions,
          notify_mentions: profileState.notifyMentions,
          notifyDigest: profileState.notifyDigest,
          notify_digest: profileState.notifyDigest,
        } as any,
      }));
    } catch (err) {
      console.error('Failed to persist profile:', err);
    }

    // If user has already configured model and keys (e.g. editing from workspace), return to workspace
    const isModelKeysConfigured = typeof localStorage !== 'undefined' && localStorage.getItem('eris_model_keys_configured') === 'true';
    if (isModelKeysConfigured || activeSession?.isConfigured) {
      navigate('workspace');
    } else {
      navigate('model_keys_setup');
    }
  };

  const accountScopeKey = (
    activeSession?.email ||
    activeSession?.username ||
    'local_user'
  ).toLowerCase().trim();

  const activeBio =
    activeSession?.profile?.bio ||
    (activeSession?.profile as any)?.preferences?.bio ||
    (activeSession as any)?.bio ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_bio_${accountScopeKey}`) : '') ||
    '';

  const isRealAman = isDevIdentityConfirmed(activeBio, isDevMode);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          key={reloadKey}
          className="w-full h-screen min-h-screen overflow-hidden relative bg-black text-[#F1F5F9] font-sans flex flex-col"
          onContextMenu={(e) => {
            const rawTarget = e.target as HTMLElement;
            const inputEl = rawTarget.closest('input, textarea, [contenteditable="true"]') as HTMLElement | null;
            lastTargetRef.current = inputEl || rawTarget;
            const chatEl = rawTarget.closest('[data-chat-item]') as HTMLElement | null;
            const isInput = Boolean(inputEl);
            const hasSelection = Boolean(window.getSelection()?.toString().trim());
            const isWorkspace = current.screen === 'workspace';

            setContextInfo({
              isChat: Boolean(chatEl),
              chatId: chatEl?.getAttribute('data-chat-item') || undefined,
              chatTitle: chatEl?.getAttribute('data-chat-title') || undefined,
              isInput,
              hasSelection,
              isWorkspace,
            });
          }}
        >
          {/* Animated Screen Transitions Container */}
          <AnimatePresence mode="wait">
            {/* Intro Scene */}
            {current.screen === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <ErisIntro
                  onComplete={() => navigate('onboarding')}
                  onOpenGreeting={handleSessionEstablished}
                  onSignOut={handleSignOut}
                />
              </motion.div>
            )}

            {/* Onboarding Scene */}
            {current.screen === 'onboarding' && (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <OnboardingScreen
                  onBack={() => {
                    if (canGoBack) {
                      goBack();
                    } else {
                      navigate('intro');
                    }
                  }}
                  onComplete={(session) => handleSessionEstablished(session)}
                />
              </motion.div>
            )}

            {/* Profile Setup Scene with identical background and BlurVignette effect */}
            {current.screen === 'profile_setup' && (
              <motion.div
                key="profile_setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0 overflow-y-auto z-20 select-none"
              >
                {/* Background Image Matching Onboarding Workspace */}
                <div
                  className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
                  style={{ backgroundImage: "url('/assets/onboarding_background.png')" }}
                />
                <BlurVignette
                  radius="0px"
                  inset="0px"
                  transitionLength="120px"
                  blur="14px"
                  classname="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transform-gpu"
                >
                  <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                  <BlurVignetteArticle classname="transition-all duration-700 ease-out" />
                </BlurVignette>

                <div className="relative z-10 min-h-screen py-8 px-4 flex flex-col items-center justify-center">
                  <ProfileSettingsTemplate
                    initialState={(() => {
                      const scope = (activeSession?.email || activeSession?.username || 'local_user').toLowerCase().trim();
                      let scopedProfile: any = null;
                      try {
                        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_profile_${scope}`) : null;
                        if (raw) scopedProfile = JSON.parse(raw);
                      } catch { }

                      return {
                        displayName:
                          activeSession?.profile?.displayName ||
                          activeSession?.profile?.display_name ||
                          scopedProfile?.displayName ||
                          activeSession?.displayName ||
                          (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_display_name_${scope}`) : '') ||
                          '',
                        username:
                          activeSession?.profile?.username ||
                          scopedProfile?.username ||
                          activeSession?.username ||
                          (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_username_${scope}`) : '') ||
                          (activeSession?.email ? activeSession.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : ''),
                        email: activeSession?.email || activeSession?.profile?.email || scopedProfile?.email || '',
                        avatarUrl:
                          activeSession?.profile?.avatarUrl ||
                          activeSession?.profile?.avatar_url ||
                          scopedProfile?.avatarUrl ||
                          activeSession?.avatarUrl ||
                          (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_avatar_${scope}`) : '') ||
                          '',
                        headline:
                          activeSession?.profile?.headline ||
                          (activeSession?.profile as any)?.preferences?.headline ||
                          scopedProfile?.headline ||
                          (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_headline_${scope}`) : '') ||
                          '',
                        bio:
                          activeSession?.profile?.bio ||
                          (activeSession?.profile as any)?.preferences?.bio ||
                          (activeSession as any)?.bio ||
                          scopedProfile?.bio ||
                          (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_bio_${scope}`) : '') ||
                          '',
                        website:
                          activeSession?.profile?.website ||
                          (activeSession?.profile as any)?.preferences?.website ||
                          scopedProfile?.website ||
                          (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_website_${scope}`) : '') ||
                          '',
                        timezone:
                          (activeSession?.profile?.timezone ||
                            (activeSession?.profile as any)?.preferences?.timezone ||
                            scopedProfile?.timezone ||
                            (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_timezone_${scope}`) : '') ||
                            'Asia/Kolkata') as any,
                        visibility:
                          (activeSession?.profile?.visibility ||
                            (activeSession?.profile as any)?.preferences?.visibility ||
                            scopedProfile?.visibility ||
                            'members') as any,
                        accent:
                          (activeSession?.profile?.accent ||
                            (activeSession?.profile as any)?.preferences?.accent ||
                            scopedProfile?.accent ||
                            (typeof localStorage !== 'undefined' ? localStorage.getItem(`eris_user_accent_${scope}`) : '') ||
                            'indigo') as any,
                        notifyProduct:
                          activeSession?.profile?.notifyProduct ??
                          (activeSession?.profile as any)?.notify_product ??
                          scopedProfile?.notifyProduct ??
                          true,
                        notifyMentions:
                          activeSession?.profile?.notifyMentions ??
                          (activeSession?.profile as any)?.notify_mentions ??
                          scopedProfile?.notifyMentions ??
                          true,
                        notifyDigest:
                          activeSession?.profile?.notifyDigest ??
                          (activeSession?.profile as any)?.notify_digest ??
                          scopedProfile?.notifyDigest ??
                          false,
                      };
                    })()}
                    isDarkMode={typeof window !== 'undefined' ? (document.documentElement.classList.contains('dark') || localStorage.getItem('eris_theme') !== 'light') : true}
                    onSave={handleSaveProfile}
                    onCancel={() => {
                      if (activeSession?.isAuthenticated && (localStorage.getItem('eris_model_keys_configured') === 'true' || localStorage.getItem('eris_workspace_configured') === 'true')) {
                        navigate('workspace');
                      } else {
                        navigate('intro');
                      }
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Post-Profile Mandatory API Key Vault & Choose Model Scene with Matching Background */}
            {current.screen === 'model_keys_setup' && (
              <motion.div
                key="model_keys_setup"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0 z-20 flex items-center justify-center p-4 overflow-hidden select-none"
              >
                {/* Background Image Matching Onboarding Workspace */}
                <div
                  className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
                  style={{ backgroundImage: "url('/assets/onboarding_background.png')" }}
                />
                <BlurVignette
                  radius="0px"
                  inset="0px"
                  transitionLength="120px"
                  blur="14px"
                  classname="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transform-gpu"
                >
                  <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                  <BlurVignetteArticle classname="transition-all duration-700 ease-out" />
                </BlurVignette>

                <div className="relative z-10 w-full flex items-center justify-center">
                  {setupStep === 'keys' ? (
                    <ApiKeyVaultModal
                      isOpen={true}
                      mandatory={true}
                      proceedLabel="Choose Models"
                      onClose={() => {}}
                      onProceed={() => setSetupStep('model')}
                      isDarkMode={true}
                    />
                  ) : (
                    <ModelConfigModal
                      isOpen={true}
                      isDarkMode={true}
                      onClose={() => setSetupStep('keys')}
                      onConfirmWorkspace={() => {
                        try {
                          localStorage.setItem('eris_model_keys_configured', 'true');
                        } catch {}
                        navigate('workspace');
                      }}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Greeting Scene */}
            {current.screen === 'greeting' && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0 z-10"
              >
                <GreetingWithTransition
                  sessionStatus={activeSession ?? undefined}
                  isDevMode={isDevMode && isRealAman}
                  onEnterWorkspace={() => navigate('workspace')}
                  onOpenOnboarding={() => navigate('onboarding')}
                  onReturnToIntro={() => navigate('intro')}
                  onSignOut={handleSignOut}
                />
              </motion.div>
            )}

            {/* Workspace Scene */}
            {current.screen === 'workspace' && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <WorkspaceView
                  sessionStatus={activeSession ?? undefined}
                  onReturnToGreeting={() => navigate('greeting')}
                  onReturnToIntro={() => navigate('intro')}
                  onSignOut={handleSignOut}
                />
              </motion.div>
            )}

            {/* Workflow Studio Scene */}
            {current.screen === 'workflow' && (
              <motion.div
                key="workflow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0 z-20"
              >
                <LearningWorkflowStudio
                  isDarkMode={true}
                  onReturnToWorkspace={() => navigate('workspace')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dev Data Viewer Slide-out Panel */}
          {showDevPanel && (
            <DevDataViewer onClose={() => setShowDevPanel(false)} />
          )}
        </div>
      </ContextMenuTrigger>

      {/* ═══ Context Menu with Theme Awareness & Dev Tools ═══ */}
      <ContextMenuContent className="w-64 border border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-1.5 shadow-2xl backdrop-blur-2xl rounded-2xl font-sans text-xs select-none">
        {/* If right-clicked on a chat item, display chat title header */}
        {contextInfo.isChat && contextInfo.chatTitle && (
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] border-b border-[var(--border-workspace)] truncate mb-1">
            {contextInfo.chatTitle}
          </div>
        )}

        {/* Section 1: Navigation & Actions */}
        <ContextMenuItem
          disabled={!contextInfo.isWorkspace}
          onClick={handleNewChat}
          className="py-2 px-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-medium">New Chat</span>
          </div>
          <ContextMenuShortcut>Ctrl+N</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => reload()}
          className="py-2 px-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-medium">Reload</span>
          </div>
          <ContextMenuShortcut>Ctrl+R</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Section 2: Clipboard Actions */}
        <ContextMenuItem
          disabled={!(contextInfo.isInput && contextInfo.hasSelection)}
          onClick={handleCut}
          className="py-2 px-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Scissors className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-medium">Cut</span>
          </div>
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          disabled={!(contextInfo.hasSelection || contextInfo.isInput)}
          onClick={handleCopy}
          className="py-2 px-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-medium">Copy</span>
          </div>
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          disabled={!contextInfo.isInput}
          onClick={handlePaste}
          className="py-2 px-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-medium">Paste</span>
          </div>
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Section 3: Destructive Contextual Item (Enabled ONLY for chats in leftbar, greyed out otherwise) */}
        <ContextMenuItem
          destructive
          disabled={!contextInfo.isChat}
          onClick={handleDeleteChat}
          className="py-2 px-3 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-4 h-4" />
            <span className="font-medium">Delete Chat</span>
          </div>
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Section 4: Dev Mode (Strictly restricted to verified creator identity) */}
        {isDevMode && isRealAman && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => setShowDevPanel(true)}
              className="py-2 px-3 rounded-xl text-amber-500 dark:text-amber-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="font-medium">View Local Data</span>
              </div>
            </ContextMenuItem>
            <ContextMenuItem
              destructive
              onClick={async () => {
                if (window.confirm("Clear all local ERIS data and reset storage? This will clear local caches, panel settings, preferences, and reload the application.")) {
                  try {
                    await fetch('/api/system/dev-clear-all-data', { method: 'POST' });
                  } catch {
                    // Ignore network error during local reset
                  }
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch {
                    // ignore
                  }
                  window.location.href = '/';
                }
              }}
              className="py-2 px-3 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="font-medium">Clear All Local Data</span>
              </div>
              <ContextMenuShortcut>Dev</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const App: React.FC = () => {
  return (
    <DevModeProvider>
      <AppStateProvider>
        <KeyboardShortcutProvider>
          <AppContent />
        </KeyboardShortcutProvider>
      </AppStateProvider>
    </DevModeProvider>
  );
};

export default App;
