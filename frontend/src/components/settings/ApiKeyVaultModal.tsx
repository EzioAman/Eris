import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PROVIDER_KEY_LINKS } from '../workspace/ModelConfigModal';

export interface KeyItem {
  id: string;
  provider: string;
  label: string;
  key_masked: string;
  model_name?: string | null;
  base_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  mandatory?: boolean;
  onProceed?: () => void;
  proceedLabel?: string;
}

const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini/gemini-3-flash-preview', placeholder: 'AIzaSy...', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta', link: 'https://aistudio.google.com/app/apikey' },
  { id: 'openrouter', name: 'OpenRouter', defaultModel: 'openrouter/auto', placeholder: 'sk-or-v1-...', defaultBaseUrl: 'https://openrouter.ai/api/v1', link: 'https://openrouter.ai/keys' },
  { id: 'groq', name: 'Groq Cloud', defaultModel: 'groq/llama-3.3-70b-versatile', placeholder: 'gsk_...', defaultBaseUrl: 'https://api.groq.com/openai/v1', link: 'https://console.groq.com/keys' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'openai/gpt-4o', placeholder: 'sk-proj-...', defaultBaseUrl: 'https://api.openai.com/v1', link: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', defaultModel: 'anthropic/claude-3-5-sonnet', placeholder: 'sk-ant-...', defaultBaseUrl: 'https://api.anthropic.com/v1', link: 'https://console.anthropic.com/settings/keys' },
  { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek/deepseek-chat', placeholder: 'sk-...', defaultBaseUrl: 'https://api.deepseek.com/v1', link: 'https://platform.deepseek.com/api_keys' },
  { id: 'nvidia', name: 'Nvidia NIM', defaultModel: 'nvidia/meta/llama-3.3-70b-instruct', placeholder: 'nvapi-...', defaultBaseUrl: 'https://integrate.api.nvidia.com/v1', link: 'https://build.nvidia.com/' },
  { id: 'ollama', name: 'Ollama (Local)', defaultModel: 'ollama/llama3.2', placeholder: 'ollama-local', defaultBaseUrl: 'http://localhost:11434/v1', link: 'https://ollama.com/' },
  { id: 'custom', name: 'Custom OpenAI-Compatible', defaultModel: '', placeholder: 'Bearer key...', defaultBaseUrl: 'http://localhost:8000/v1', link: '' },
];

export const ApiKeyVaultModal: React.FC<ApiKeyVaultModalProps> = ({
  isOpen,
  onClose,
  isDarkMode: _isDarkMode = true,
  mandatory = false,
  onProceed,
  proceedLabel,
}) => {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [provider, setProvider] = useState('gemini');
  const [label, setLabel] = useState('');
  const [rawKey, setRawKey] = useState('');
  const [modelName, setModelName] = useState('gemini/gemini-3-flash-preview');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta');
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      } else {
        setError('Failed to retrieve keys from local vault.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to API keys vault.');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const p = PROVIDERS.find((item) => item.id === newProvider);
    if (p) {
      if (p.defaultModel) setModelName(p.defaultModel);
      if (p.defaultBaseUrl) setBaseUrl(p.defaultBaseUrl);
      else setBaseUrl('');
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKey.trim() || !label.trim()) {
      setError('Please provide both a label and an API key.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          label: label.trim(),
          api_key: rawKey.trim(),
          model_name: modelName.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setKeys((prev) => [created, ...prev]);
        setSuccessMsg(`Encrypted and added key "${created.label}".`);
        // Reset form
        setRawKey('');
        setLabel('');
        setIsAdding(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to save API key to vault.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error saving API key.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (keyId: string) => {
    try {
      const res = await fetch(`/api/keys/${keyId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, is_active: !k.is_active } : k))
        );
      }
    } catch (err) {
      console.error('Error toggling key state:', err);
    }
  };

  const handleDelete = async (keyId: string, keyLabel: string) => {
    if (!window.confirm(`Permanently remove API key "${keyLabel}" from the vault?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
        setSuccessMsg(`Removed key "${keyLabel}".`);
      }
    } catch (err) {
      console.error('Error deleting key:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={mandatory ? undefined : onClose}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col max-h-[85vh] overflow-hidden transition-all dashboard-modal-glow',
          'bg-[var(--bg-surface)] border-violet-500/30 text-[var(--text-primary)]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-workspace)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <KeyRound className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight">API Key Vault</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  Local Encrypted Storage
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {mandatory
                  ? 'Configure at least one active API key to enable model inference and reasoning.'
                  : 'Configure your LLM credentials securely. Stored in your local encrypted database.'}
              </p>
            </div>
          </div>
          {!mandatory && (
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Key Button / Form */}
          {!isAdding ? (
            <div className="flex items-center justify-between bg-[var(--bg-input)]/50 border border-[var(--border-workspace)] rounded-xl p-3.5">
              <div className="text-xs text-[var(--text-secondary)]">
                You can configure multiple keys even for the same provider and switch between them.
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all active:scale-95 shrink-0"
              >
                <Plus className="size-3.5" />
                Add API Key
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleAddKey}
              className="p-4 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border-highlight)] space-y-3 shadow-inner"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-workspace)]">
                <span className="text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  New Provider Key
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--bg-input)] border border-[var(--border-workspace)] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Key Label / Identifier
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Gemini Pro Key"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--bg-input)] border border-[var(--border-workspace)] px-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Secret API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    required
                    placeholder={
                      PROVIDERS.find((p) => p.id === provider)?.placeholder || 'Enter API key...'
                    }
                    value={rawKey}
                    onChange={(e) => setRawKey(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--bg-input)] border border-[var(--border-workspace)] pl-2.5 pr-9 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Model Tag (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. gemini/gemini-3-flash-preview or openrouter/auto"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--bg-input)] border border-[var(--border-workspace)] px-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Base URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. http://localhost:11434"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[var(--bg-input)] border border-[var(--border-workspace)] px-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Dynamic Provider Key Link */}
              {PROVIDER_KEY_LINKS[provider] && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] pt-1 pb-1">
                  <span>Don't have a key? get it here-</span>
                  <a
                    href={PROVIDER_KEY_LINKS[provider].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{PROVIDER_KEY_LINKS[provider].url}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-workspace)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="size-3.5" />
                  {submitting ? 'Encrypting...' : 'Encrypt & Save to Vault'}
                </button>
              </div>
            </form>
          )}

          {/* Stored Keys List */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold px-1">
              Active Keys in Local Vault ({keys.length})
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading vault items...</div>
            ) : keys.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[var(--bg-input)]/30 border border-[var(--border-workspace)] text-xs text-[var(--text-secondary)]">
                No keys saved in the local vault. Add an API key above to enable agent reasoning.
              </div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-all',
                    k.is_active
                      ? 'bg-[var(--bg-card)] border-[var(--border-workspace)] hover:border-[var(--border-highlight)]'
                      : 'bg-[var(--bg-input)]/20 border-[var(--border-workspace)]/50 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-lg bg-[var(--bg-input)] border border-[var(--border-workspace)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 font-mono text-[10px] font-bold uppercase">
                      {k.provider.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {k.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shrink-0">
                          {k.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[var(--text-secondary)]">
                        <span>{k.key_masked}</span>
                        {k.model_name && (
                          <>
                            <span className="opacity-40">•</span>
                            <span className="truncate text-[var(--text-secondary)]/75">{k.model_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(k.id)}
                      title={k.is_active ? 'Disable this key' : 'Enable this key'}
                      className={cn(
                        'cursor-pointer px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        k.is_active
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-workspace)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      {k.is_active ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(k.id, k.label)}
                      title="Delete key permanently"
                      className="cursor-pointer size-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Security Notice & Mandatory Proceed Action */}
        <div className="px-6 py-3.5 border-t border-[var(--border-workspace)] bg-[var(--bg-input)]/40 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)] shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-[var(--accent-primary)] shrink-0" />
            <span>
              {mandatory
                ? 'At least 1 active key is required in your local vault before reasoning can start.'
                : 'Your API keys are stored locally on your device and are never exposed in prompts or responses.'}
            </span>
          </div>

          {mandatory && (
            <button
              type="button"
              disabled={keys.length === 0}
              onClick={onProceed || onClose}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0",
                keys.length > 0
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white cursor-pointer shadow-violet-500/25"
                  : "bg-white/10 text-neutral-400 cursor-not-allowed border border-white/5"
              )}
            >
              <span>{proceedLabel || 'Continue to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyVaultModal;
