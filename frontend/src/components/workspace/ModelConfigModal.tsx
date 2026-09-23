import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  CheckCircle2,
  Check,
  Brain,
  Code2,
  Eye,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Particles } from '../magicui/particles';
import { Meteors } from '../magicui/meteors';
import {
  DataTableTemplate,
  type DataTableColumn,
  type FacetedFilter,
} from '../../../ui_templates/DataTableTemplate';

export interface ModelItem {
  provider: string;
  id: string;
  name: string;
  price?: string;
  cost?: string;
  capabilities: string[];
  display?: string;
  context?: string;
  speed?: string;
  status?: string;
  verified?: boolean;
}

export interface ModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onModelSelected?: (modelId: string) => void;
  onConfirmWorkspace?: () => void;
  onOpenApiKeyVault?: () => void;
}

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onModelSelected,
  onConfirmWorkspace,
  onOpenApiKeyVault,
}) => {
  const [activeModel, setActiveModel] = useState<string>('');
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const handleOpenVault = () => {
    onClose();
    if (onOpenApiKeyVault) {
      onOpenApiKeyVault();
    } else {
      window.dispatchEvent(new CustomEvent('eris:open-vault'));
    }
  };

  // Fetch live model matrix from backend
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/system/models')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setModels(data.models || []);
            setActiveModel(data.active_model || '');
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));

      fetch('/api/system/state')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.active_model) {
            setActiveModel(data.active_model);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectModel = async (modelId: string) => {
    setActiveModel(modelId);
    setSavedSuccess(modelId);
    onModelSelected?.(modelId);
    window.dispatchEvent(new CustomEvent('eris:model-changed', { detail: { modelId } }));
    try {
      const res = await fetch('/api/system/models/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });
      const data = await res.json();
      if (data.ok && data.active_model) {
        setActiveModel(data.active_model);
      }
    } catch (err) {
      console.error('Failed to select model:', err);
    }
  };

  useEffect(() => {
    if (!savedSuccess) return;
    const t = setTimeout(() => setSavedSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [savedSuccess]);

  // Columns specification for ReactBits Pro DataTable
  const columns: DataTableColumn<ModelItem>[] = React.useMemo(() => [
    {
      id: 'name',
      header: 'Model Name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col min-w-[160px]">
          <span
            className={cn(
              'font-semibold text-xs tracking-tight flex items-center gap-1.5',
              isDarkMode ? 'text-white' : 'text-slate-900'
            )}
          >
            {row.name}
            {row.id === activeModel && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border font-semibold',
                  isDarkMode
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                )}
              >
                Active
              </span>
            )}
            {row.verified && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border font-semibold',
                  isDarkMode
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-300'
                )}
                title="Verified with your API key"
              >
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                Verified
              </span>
            )}
          </span>
          <span
            className={cn(
              'text-xs font-mono truncate mt-0.5',
              isDarkMode ? 'text-neutral-400' : 'text-slate-500'
            )}
          >
            {row.id}
          </span>
        </div>
      ),
    },
    {
      id: 'provider',
      header: 'Provider',
      accessorKey: 'provider',
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-md border',
            isDarkMode
              ? 'border-white/10 bg-white/5 text-neutral-300'
              : 'border-slate-200 bg-slate-100 text-slate-700'
          )}
        >
          {row.provider}
        </span>
      ),
    },
    {
      id: 'capabilities',
      header: 'Capabilities',
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.capabilities?.map((cap) => (
            <span
              key={cap}
              className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded border',
                cap === 'Free'
                  ? isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : cap === 'Reasoning'
                  ? isDarkMode ? 'border-purple-500/30 bg-purple-500/10 text-purple-300' : 'border-purple-200 bg-purple-50 text-purple-700'
                  : cap === 'Coding'
                  ? isDarkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'
                  : cap === 'Vision'
                  ? isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                  : cap === 'Audio'
                  ? isDarkMode ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : isDarkMode ? 'border-white/10 bg-white/5 text-neutral-300' : 'border-slate-200 bg-slate-100 text-slate-600'
              )}
            >
              {cap}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Pricing',
      accessorKey: 'price',
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            'text-xs font-mono',
            row.price?.toLowerCase().includes('free') || row.price?.includes('$0.00')
              ? isDarkMode ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-semibold'
              : isDarkMode ? 'text-neutral-400' : 'text-slate-500'
          )}
        >
          {row.price || 'Pay per token'}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      hideable: false,
      render: (row) => {
        const isActive = row.id === activeModel;
        return (
          <button
            type="button"
            onClick={() => handleSelectModel(row.id)}
            className={cn(
              'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-2xs',
              isActive
                ? isDarkMode
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold'
                : isDarkMode
                ? 'border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 font-medium'
                : 'border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium'
            )}
          >
            {isActive ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Selected</span>
              </>
            ) : (
              <span>Select Model</span>
            )}
          </button>
        );
      },
    },
  ], [activeModel, isDarkMode]);

  // Dynamically derive faceted filter options from actual live fetched models
  const facetedFilters: FacetedFilter[] = React.useMemo(() => {
    const uniqueProviders = Array.from(
      new Set(models.map((m) => m.provider).filter(Boolean))
    ).sort();

    const providerOptions = uniqueProviders.map((p) => ({
      label: p,
      value: p,
    }));

    const uniqueCaps = Array.from(
      new Set(models.flatMap((m) => m.capabilities || []).filter(Boolean))
    ).sort();

    const capIconMap: Record<string, any> = {
      Free: Sparkles,
      Coding: Code2,
      Reasoning: Brain,
      Vision: Eye,
      Audio: Zap,
    };

    const capabilityOptions = uniqueCaps.map((c) => ({
      label: c,
      value: c,
      icon: capIconMap[c],
    }));

    const filters: FacetedFilter[] = [];
    if (providerOptions.length > 0) {
      filters.push({
        id: 'provider',
        title: 'Provider',
        options: providerOptions,
        filterFn: (row, selected) => selected.includes(row.provider),
      });
    }
    if (capabilityOptions.length > 0) {
      filters.push({
        id: 'capabilities',
        title: 'Capabilities',
        options: capabilityOptions,
        filterFn: (row, selected) => {
          const caps = row.capabilities || [];
          return selected.every((s) => caps.includes(s));
        },
      });
    }
    return filters;
  }, [models]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none font-sans">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={cn(
            'w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border relative z-10 flex flex-col dashboard-modal-glow',
            isDarkMode
              ? 'border-violet-500/30 bg-[#06080F]/90 backdrop-blur-3xl text-white shadow-2xl'
              : 'border-slate-200 bg-white/95 backdrop-blur-3xl text-slate-900 shadow-2xl'
          )}
        >
          {/* Cosmic Starfield Background (Dark Theme Only) */}
          {isDarkMode && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              <Particles
                className="absolute inset-0 z-0"
                quantity={70}
                staticity={35}
                ease={50}
                size={1.1}
                color="#f8e7c9"
              />
              <Meteors number={18} />
            </div>
          )}

          {/* Header Bar */}
          <div
            className={cn(
              'p-5 sm:p-6 border-b flex items-start justify-between gap-4 relative z-10',
              isDarkMode
                ? 'border-white/10 bg-black/40 backdrop-blur-md'
                : 'border-slate-200/80 bg-slate-50/80 backdrop-blur-md'
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className={cn("w-5 h-5", isDarkMode ? "text-amber-400" : "text-amber-500")} />
                <h3
                  className={cn(
                    "text-lg sm:text-xl font-bold tracking-tight",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}
                >
                  Choose your model
                </h3>
              </div>
              <p
                className={cn(
                  "text-xs mt-1 leading-relaxed max-w-2xl",
                  isDarkMode ? "text-neutral-300" : "text-slate-500"
                )}
              >
                Select an active intelligence model for ERIS. Configure your credentials securely in the API Key Vault.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <button
                type="button"
                onClick={handleOpenVault}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer",
                  isDarkMode
                    ? "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300"
                    : "border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700"
                )}
                title="Configure API keys"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>API Key Vault</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'p-2 rounded-xl transition-colors cursor-pointer shrink-0',
                  isDarkMode
                    ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                )}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Model Bar */}
          <div
            className={cn(
              'px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs relative z-10',
              isDarkMode
                ? 'border-white/10 bg-black/30 backdrop-blur-sm'
                : 'border-slate-200/80 bg-slate-50/60 backdrop-blur-sm'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={isDarkMode ? "text-neutral-400" : "text-slate-500"}>Active Model:</span>
              {activeModel ? (
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-mono font-semibold text-xs border flex items-center gap-1.5',
                    isDarkMode
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{activeModel}</span>
                </span>
              ) : (
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-mono font-semibold text-xs border flex items-center gap-1.5',
                    isDarkMode
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  )}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>None Selected</span>
                </span>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {savedSuccess && (
            <div
              className={cn(
                "px-5 py-2.5 border-b text-xs flex items-center gap-2 transition-all font-medium relative z-10",
                isDarkMode
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Active model is now set to <strong>{savedSuccess}</strong>.
              </span>
            </div>
          )}

          {/* No Keys / Empty Vault Guidance Banner */}
          {!isLoading && models.length === 0 && (
            <div
              className={cn(
                "mx-4 sm:mx-5 mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10",
                isDarkMode
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              )}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className={cn("text-xs font-bold", isDarkMode ? "text-white" : "text-amber-950")}>
                    No Verified Models Found
                  </div>
                  <div className={cn("text-xs mt-0.5", isDarkMode ? "text-neutral-300" : "text-amber-800")}>
                    No active API keys were detected in the Vault. Enter your API keys to dynamically verify and unlock available models.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenVault}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-all shrink-0 cursor-pointer shadow-xs"
              >
                Configure Keys in Vault
              </button>
            </div>
          )}

          {/* Data Table Body */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto relative z-10">
            <DataTableTemplate
              columns={columns}
              data={models}
              keyField="id"
              searchPlaceholder="Filter models by name, provider, or capability..."
              facetedFilters={facetedFilters}
              selectable={false}
              pageSize={8}
              isDarkMode={isDarkMode}
              emptyMessage={
                isLoading
                  ? 'Verifying keys & discovering models...'
                  : 'No models match the filter. Enter your API key in Key Vault to verify and unlock models.'
              }
            />
          </div>

          {/* Modal Footer / Confirm Action */}
          <div
            className={cn(
              "p-4 border-t flex items-center justify-between z-10",
              isDarkMode
                ? "border-white/10 bg-black/50 backdrop-blur-md"
                : "border-slate-200/80 bg-slate-50/90 backdrop-blur-md"
            )}
          >
            <div className={cn("text-xs flex items-center gap-1.5", isDarkMode ? "text-neutral-400" : "text-slate-500")}>
              <span>Active Selection:</span>
              {activeModel ? (
                <strong className={cn("font-mono", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                  {activeModel}
                </strong>
              ) : (
                <strong className={cn("font-mono", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                  None Selected
                </strong>
              )}
            </div>
            {onConfirmWorkspace && (
              <button
                type="button"
                disabled={!activeModel}
                onClick={() => {
                  if (!activeModel) return;
                  try {
                    localStorage.setItem('eris_model_keys_configured', 'true');
                  } catch {}
                  onConfirmWorkspace();
                }}
                className={cn(
                  'px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-transform active:scale-95 shadow-lg',
                  activeModel
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white cursor-pointer shadow-indigo-500/20'
                    : isDarkMode
                    ? 'bg-neutral-800 text-neutral-500 border border-white/10 cursor-not-allowed opacity-60'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                )}
              >
                <span>{activeModel ? 'Confirm & Enter Workspace' : 'Select a Model to Continue'}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ModelConfigModal;
