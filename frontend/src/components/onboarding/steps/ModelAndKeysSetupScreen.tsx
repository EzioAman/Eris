import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  KeyRound,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Lock,
} from 'lucide-react';
import { BlurVignette, BlurVignetteArticle } from '../../ui/blur-vignette';
import { cn } from '../../../lib/utils';

interface ModelAndKeysSetupScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    model: 'gemini/gemini-3.6-flash',
    tag: 'Fast & Agentic',
    placeholder: 'AIzaSy...',
    hint: 'Recommended for reasoning & tool calling',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    model: 'openrouter/anthropic/claude-3.5-sonnet',
    tag: 'Multi-Model Routing',
    placeholder: 'sk-or-v1-...',
    hint: 'Access Claude 3.5, GPT-4o, DeepSeek',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    model: 'groq/llama-3.3-70b-versatile',
    tag: 'Ultra Low Latency',
    placeholder: 'gsk_...',
    hint: 'Near-instant inference speeds',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    model: 'openai/gpt-4o',
    tag: 'Industry Standard',
    placeholder: 'sk-proj-...',
    hint: 'Direct GPT-4o / o1 reasoning',
  },
  {
    id: 'ollama',
    name: 'Local Ollama',
    model: 'ollama/llama3.2',
    tag: '100% Offline',
    placeholder: 'http://localhost:11434',
    hint: 'Zero cloud dependencies',
  },
];

export const ModelAndKeysSetupScreen: React.FC<ModelAndKeysSetupScreenProps> = ({
  onComplete,
  onBack,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedKeysCount, setSavedKeysCount] = useState<number>(0);

  // Check existing keys in vault
  useEffect(() => {
    fetch('/api/keys')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSavedKeysCount(data.length);
        }
      })
      .catch(() => {});
  }, []);

  const activeProviderObj = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  const handleSaveKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!apiKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid API key or token.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // 1. Save key to encrypted vault
      const keyRes = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          label: `${activeProviderObj.name} Primary`,
          key: apiKey.trim(),
          model_name: activeProviderObj.model,
          base_url: selectedProvider === 'ollama' ? apiKey.trim() : null,
        }),
      });

      if (!keyRes.ok) {
        throw new Error('Failed to save key into local encrypted vault.');
      }

      // 2. Select this model as the active runtime model
      await fetch('/api/system/models/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: activeProviderObj.model }),
      });

      setSavedKeysCount((prev) => prev + 1);
      setStatusMessage({
        type: 'success',
        text: `Encrypted and saved ${activeProviderObj.name} key. Active model configured.`,
      });
      setApiKey('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving API key.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center overflow-y-auto py-10 px-4 select-none">
      {/* Background Image Matching Onboarding Workspace */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/assets/onboarding_background.png')" }}
      />

      {/* Apple Vision Pro Style Blur Vignette Background Overlay */}
      <BlurVignette
        radius="0px"
        inset="0px"
        transitionLength="120px"
        blur="14px"
        classname="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transform-gpu"
      >
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <BlurVignetteArticle classname="transition-all duration-700 ease-out" />
      </BlurVignette>

      {/* Main Glassmorphic Setup Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl rounded-3xl p-6 sm:p-8 border border-white/10 bg-[#0B0F17]/90 text-white shadow-2xl backdrop-blur-2xl"
      >
        {/* Step Badge & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border border-violet-500/30 bg-violet-500/10 text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
            Step 2: Models & API Key Vault
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Configure Models & API Keys
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Select an AI model provider and enter your API key. Keys are encrypted and stored locally on your device.
          </p>
        </div>

        {/* Provider Cards Selector */}
        <div className="space-y-2 mb-5">
          <label className="block text-xs font-semibold text-neutral-300">
            Choose Primary Model Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(p.id);
                    setStatusMessage(null);
                  }}
                  className={cn(
                    'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                    isSelected
                      ? 'border-violet-500 bg-violet-500/15 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                      : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/15 hover:bg-white/[0.05] hover:text-neutral-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate">{p.name}</span>
                    <Cpu className={cn('w-3.5 h-3.5', isSelected ? 'text-violet-400' : 'text-neutral-500')} />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 truncate">
                    {p.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Input Form */}
        <form onSubmit={handleSaveKey} className="space-y-4 mb-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                {activeProviderObj.name} API Key / Endpoint
              </label>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> AES-256 Vault
              </span>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={activeProviderObj.placeholder}
                className="w-full h-11 rounded-xl bg-black/40 border border-white/10 px-3.5 pr-10 text-xs font-mono text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {activeProviderObj.hint}
            </p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={cn(
                'p-3 rounded-xl text-xs flex items-center gap-2',
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              )}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Row for Saving Key */}
          {apiKey.trim() && (
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <span className="animate-pulse">Encrypting & Storing in Vault...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Save {activeProviderObj.name} Key to Vault
                </>
              )}
            </button>
          )}
        </form>

        {/* Primary Completion Button to Go to Dashboard */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-neutral-400">
            {savedKeysCount > 0 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {savedKeysCount} key(s) secured in local vault
              </span>
            ) : (
              'You can also add or rotate keys anytime from the topbar.'
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={onComplete}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-violet-500/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch ERIS Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ModelAndKeysSetupScreen;
