import React, { useState } from 'react';
import { X, Plug, KeyRound } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PluginTool {
  name: string;
  description: string;
}

export interface PluginConfigField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
  default?: string;
}

export interface PluginItem {
  id: string;
  name: string;
  usage: string;
  tools: PluginTool[];
  dependency: boolean;
  dependency_prompt?: string;
  config_fields: PluginConfigField[];
  is_enabled: boolean;
  is_configured: boolean;
  config?: Record<string, any>;
  last_tested_at?: string;
}

interface PluginConfigModalProps {
  plugin: PluginItem | null;
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSaveConfig: (pluginId: string, config: Record<string, any>) => Promise<void>;
}

export const PluginConfigModal: React.FC<PluginConfigModalProps> = ({
  plugin,
  isOpen,
  isDarkMode,
  onClose,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (plugin) {
      const initial: Record<string, any> = { ...(plugin.config || {}) };
      plugin.config_fields.forEach((field) => {
        if (initial[field.key] === undefined && field.default) {
          initial[field.key] = field.default;
        }
      });
      setFormData(initial);
      setErrorMsg(null);
    }
  }, [plugin]);

  if (!isOpen || !plugin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate mandatory fields
    for (const field of plugin.config_fields) {
      if (field.required && !formData[field.key]?.toString().trim()) {
        setErrorMsg(`Mandatory field required: ${field.label}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSaveConfig(plugin.id, formData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all font-sans',
          isDarkMode
            ? 'bg-[#0E131F] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'size-10 rounded-xl flex items-center justify-center border',
                isDarkMode
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              )}
            >
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{plugin.name}</h2>
              <p className="text-xs opacity-70 mt-0.5">{plugin.usage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tools Available Breakdown */}
        <div className="my-4 p-3 rounded-xl border border-white/10 dark:border-white/10 bg-white/[0.02]">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 block mb-2">
            Tools Provided by this Plugin
          </span>
          <div className="space-y-1.5">
            {plugin.tools.map((t, idx) => (
              <div key={t.name} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-cyan-500 font-bold shrink-0">{idx + 1}.</span>
                <div>
                  <span className="font-mono font-semibold">{t.name}: </span>
                  <span className="opacity-80">{t.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dependency Requirement Notice */}
        {plugin.dependency && (
          <div
            className={cn(
              'mb-4 p-3 rounded-xl border flex items-start gap-2.5',
              isDarkMode
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            )}
          >
            <KeyRound
              className={cn(
                'w-4 h-4 shrink-0 mt-0.5',
                isDarkMode ? 'text-amber-400' : 'text-amber-700'
              )}
            />
            <div className="text-xs">
              <span
                className={cn(
                  'font-semibold block',
                  isDarkMode ? 'text-amber-300' : 'text-amber-950 font-bold'
                )}
              >
                Mandatory Credentials Required
              </span>
              <p
                className={cn(
                  'mt-0.5',
                  isDarkMode ? 'text-amber-200/90' : 'text-amber-800'
                )}
              >
                {plugin.dependency_prompt || 'Enter the required credentials below before activating this plugin.'}
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {plugin.config_fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs font-medium block">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors font-sans',
                  isDarkMode
                    ? 'bg-black/30 border-white/10 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 shadow-xs'
                )}
              />
            </div>
          ))}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5',
                isDarkMode
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {isSubmitting ? 'Verifying...' : 'Save & Activate Plugin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default PluginConfigModal;
