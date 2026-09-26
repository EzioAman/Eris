import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Cpu,
  KeyRound,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProfileSettingsTemplate, type ProfileState } from '../../../ui_templates/ProfileSettingsTemplate';

export interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  activeModel?: string;
  onOpenModelConfig?: () => void;
  onOpenApiKeyVault?: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  activeModel = 'gemini/gemini-3-flash-preview',
  onOpenModelConfig,
  onOpenApiKeyVault,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'intelligence'>('profile');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSaveProfile = async (state: ProfileState) => {
    try {
      const payload = {
        display_name: state.displayName,
        username: state.username,
        avatar_url: state.avatarUrl || null,
        headline: state.headline || '',
        bio: state.bio || '',
        website: state.website || '',
        timezone: state.timezone || 'Asia/Kolkata',
        visibility: state.visibility || 'members',
        accent: state.accent || 'indigo',
        notify_product: state.notifyProduct ?? true,
        notify_mentions: state.notifyMentions ?? true,
        notify_digest: state.notifyDigest ?? false,
      };

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Cache to localStorage for fast local rehydration
        localStorage.setItem('eris_user_display_name', state.displayName);
        localStorage.setItem('eris_username', state.username);
        if (state.avatarUrl) {
          localStorage.setItem('eris_user_avatar', state.avatarUrl);
        }
        localStorage.setItem('eris_user_headline', state.headline || '');
        localStorage.setItem('eris_user_bio', state.bio || '');
        localStorage.setItem('eris_user_website', state.website || '');
        localStorage.setItem('eris_user_timezone', state.timezone || 'Asia/Kolkata');
        localStorage.setItem('eris_user_accent', state.accent || 'indigo');

        // Notify other components (Header, LeftSidebar, UserMenu)
        window.dispatchEvent(new CustomEvent('eris:profile-updated', { detail: payload }));
      }
    } catch (err) {
      console.error('Failed to persist profile:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md select-none font-sans">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={cn(
            'w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border relative z-10 flex flex-col shadow-2xl',
            isDarkMode
              ? 'border-white/10 bg-[#0B0F17]/95 backdrop-blur-3xl text-white shadow-black/80'
              : 'border-slate-200 bg-white/95 backdrop-blur-3xl text-slate-900 shadow-slate-200/60'
          )}
        >
          {/* Header Bar */}
          <div
            className={cn(
              'p-4 sm:p-5 border-b flex items-center justify-between gap-4 shrink-0',
              isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/80'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'size-10 rounded-2xl flex items-center justify-center border shadow-xs',
                  isDarkMode
                    ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-400'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-600'
                )}
              >
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Settings & Profile
                </h2>
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                  )}
                >
                  Manage your workstation profile, active intelligence model, and preferences.
                </p>
              </div>
            </div>

            {/* Navigation Tabs in Header */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/10 bg-black/20 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'profile'
                    ? isDarkMode
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('intelligence')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'intelligence'
                    ? isDarkMode
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                )}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>AI & Models</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-2 rounded-xl transition-colors cursor-pointer shrink-0',
                isDarkMode
                  ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              )}
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
            {activeTab === 'profile' ? (
              <ProfileSettingsTemplate
                isDarkMode={isDarkMode}
                onSave={handleSaveProfile}
                onCancel={onClose}
              />
            ) : (
              <div className="max-w-2xl mx-auto space-y-6 py-4">
                {/* Active Model Card */}
                <div
                  className={cn(
                    'p-5 rounded-2xl border transition-all',
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-bold">Active Intelligence Model</h4>
                      </div>
                      <p
                        className={cn(
                          'text-xs mt-1 leading-relaxed',
                          isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                        )}
                      >
                        All workspace chats, agent swarms, and tools query this model by default.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenModelConfig?.();
                      }}
                      className={cn(
                        'cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 shadow-xs',
                        isDarkMode
                          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                          : 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Switch Model</span>
                    </button>
                  </div>

                  <div className="mt-4 p-3 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {activeModel}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold">
                      Active
                    </span>
                  </div>
                </div>

                {/* API Key Vault Card */}
                <div
                  className={cn(
                    'p-5 rounded-2xl border transition-all',
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-violet-400" />
                        <h4 className="text-sm font-bold">API Key Vault</h4>
                      </div>
                      <p
                        className={cn(
                          'text-xs mt-1 leading-relaxed',
                          isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                        )}
                      >
                        Securely manage your encrypted API keys for Gemini, OpenRouter, Groq, Anthropic, and OpenAI.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenApiKeyVault?.();
                      }}
                      className={cn(
                        'cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 shadow-xs',
                        isDarkMode
                          ? 'border border-violet-500/40 bg-violet-500/15 text-violet-300 hover:bg-violet-500/25'
                          : 'border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
                      )}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Manage Keys</span>
                    </button>
                  </div>
                </div>

                {/* Local Workstation Security Note */}
                <div
                  className={cn(
                    'p-4 rounded-xl border flex items-center gap-3 text-xs',
                    isDarkMode
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                  )}
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>
                    Your profile data, conversations, and API keys are stored strictly on your local machine and never synced to external servers.
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
