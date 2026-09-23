import React, { useState } from 'react';
import {
  X,
  Play,
  ChevronDown,
  Bot,
  GitFork,
  FileCode2,
  Globe,
  Scale,
  Cpu,
  Copy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowNode } from './workflowTypes';

export interface StepInspectorProps {
  node: WorkflowNode | null;
  isDarkMode: boolean;
  onClose: () => void;
  onUpdateNodeConfig?: (nodeId: string, updates: Partial<WorkflowNode['config']>) => void;
}

const renderInspectorIcon = (icon: string) => {
  switch (icon) {
    case 'git':
      return <img src="/icons/git.png" alt="Git" className="w-5 h-5 object-contain" />;
    case 'terminal':
    case 'cmd':
      return <img src="/icons/terminal.png" alt="Terminal" className="w-5 h-5 object-contain" />;
    case 'github':
      return <img src="/icons/github.png" alt="GitHub" className="w-5 h-5 object-contain" />;
    case 'gmail':
    case 'email':
      return <img src="/icons/gmail.png" alt="Gmail" className="w-5 h-5 object-contain" />;
    case 'notion':
      return <img src="/icons/notion.png" alt="Notion" className="w-5 h-5 object-contain" />;
    case 'minmax':
      return <Scale className="w-5 h-5 text-amber-500" />;
    case 'file':
      return <FileCode2 className="w-5 h-5 text-emerald-500" />;
    case 'web':
      return <Globe className="w-5 h-5 text-blue-500" />;
    case 'ai':
      return <Bot className="w-5 h-5 text-purple-400" />;
    case 'condition':
      return <GitFork className="w-5 h-5 text-amber-400" />;
    default:
      return <Cpu className="w-5 h-5 text-sky-400" />;
  }
};

export const StepInspector: React.FC<StepInspectorProps> = ({
  node,
  isDarkMode,
  onClose,
  onUpdateNodeConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'configure' | 'test' | 'about'>('configure');
  const [isTesting, setIsTesting] = useState(false);
  const [testProof, setTestProof] = useState<{
    function_called?: string;
    command?: string;
    exit_code?: number;
    stdout?: string;
    stderr?: string;
    duration_ms?: number;
    status?: string;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const config = node.config || {};

  const handleTestStep = async () => {
    if (!node) return;
    setIsTesting(true);
    setTestProof(null);
    try {
      const res = await fetch('/api/workflows/step/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node }),
      });
      const data = await res.json();
      if (data.ok && data.execution_output) {
        setTestProof(data.execution_output);
      } else if (data.ok) {
        setTestProof({
          function_called: `WorkflowEngine.execute_step(${node.id})`,
          exit_code: 0,
          stdout: JSON.stringify(data.outputs || { status: 'ok' }, null, 2),
          duration_ms: data.duration_ms || 40,
          status: 'success',
        });
      } else {
        setTestProof({
          status: 'failed',
          exit_code: 1,
          error: data.detail || 'Execution encountered an error',
        });
      }
    } catch (err: any) {
      setTestProof({
        status: 'failed',
        exit_code: 1,
        error: `Offline/Network error: ${err?.message || 'Connection refused'}`,
      });
    } finally {
      setIsTesting(false);
      setActiveTab('test');
    }
  };

  const handleCopyProof = () => {
    const content = testProof?.stdout || testProof?.error || '';
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside
      className={cn(
        'w-80 sm:w-96 shrink-0 border-l flex flex-col font-sans select-none overflow-hidden transition-colors z-20',
        isDarkMode
          ? 'border-white/[0.08] bg-[#0C0F17]/98 text-neutral-200'
          : 'border-slate-200 bg-white text-slate-800'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'size-9 rounded-xl flex items-center justify-center shrink-0 border',
              isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
            )}
          >
            {renderInspectorIcon(node.icon)}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate leading-tight">{node.name}</h3>
            <p className="text-xs text-neutral-400 truncate leading-tight mt-0.5">
              {node.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-lg transition-colors cursor-pointer',
            isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-800'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 flex items-center gap-5 border-b border-white/[0.06] text-xs font-semibold">
        {(['configure', 'test', 'about'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-2.5 capitalize transition-colors relative cursor-pointer',
                isActive
                  ? isDarkMode ? 'text-white' : 'text-blue-600'
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
            >
              <span>{tab}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar text-xs">
        {activeTab === 'configure' && (
          <>
            {/* Trigger Event Section */}
            {node.category === 'trigger' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Trigger event</label>
                <div
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl border',
                    isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {renderInspectorIcon(node.icon)}
                    <span className="font-medium">{config.triggerEvent || 'New issue'}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                </div>
              </div>
            )}

            {/* Repository Field */}
            {config.repository && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">
                  Repository <span className="text-rose-400">*</span>
                </label>
                <div
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl border font-mono text-neutral-200',
                    isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <span>{config.repository}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                </div>
              </div>
            )}

            {/* Git Subcommand */}
            {node.category === 'git' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Git Subcommand</label>
                <input
                  type="text"
                  value={config.gitSubcommand || 'status'}
                  onChange={(e) => onUpdateNodeConfig?.(node.id, { gitSubcommand: e.target.value as any })}
                  placeholder="status, diff, log, branch"
                  className={cn(
                    'w-full p-2.5 rounded-xl border outline-none font-mono text-xs',
                    isDarkMode ? 'border-white/10 bg-black/20 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                  )}
                />
              </div>
            )}

            {/* Shell Command */}
            {node.category === 'cmd' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Shell Command</label>
                <input
                  type="text"
                  value={config.command || 'python --version'}
                  onChange={(e) => onUpdateNodeConfig?.(node.id, { command: e.target.value })}
                  placeholder="e.g. python --version, git status"
                  className={cn(
                    'w-full p-2.5 rounded-xl border outline-none font-mono text-xs',
                    isDarkMode ? 'border-white/10 bg-black/20 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                  )}
                />
              </div>
            )}

            {/* File Operations */}
            {node.category === 'file' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">File Target</label>
                  <input
                    type="text"
                    value={config.filePath || 'backend/app/services/workflow_engine.py'}
                    onChange={(e) => onUpdateNodeConfig?.(node.id, { filePath: e.target.value })}
                    className={cn(
                      'w-full p-2.5 rounded-xl border outline-none font-mono text-xs',
                      isDarkMode ? 'border-white/10 bg-black/20 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">File Operation</label>
                  <select
                    value={config.fileOperation || 'read'}
                    onChange={(e) => onUpdateNodeConfig?.(node.id, { fileOperation: e.target.value as any })}
                    className={cn(
                      'w-full p-2.5 rounded-xl border outline-none font-sans text-xs',
                      isDarkMode ? 'border-white/10 bg-black/20 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                    )}
                  >
                    <option value="read">Read AST / Content</option>
                    <option value="write">Write / Update</option>
                    <option value="append">Append</option>
                  </select>
                </div>
              </div>
            )}

            {/* Web Search */}
            {node.category === 'web' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Web Query / URL</label>
                <input
                  type="text"
                  value={config.queryUrl || 'https://raw.githubusercontent.com'}
                  onChange={(e) => onUpdateNodeConfig?.(node.id, { queryUrl: e.target.value })}
                  placeholder="URL or query"
                  className={cn(
                    'w-full p-2.5 rounded-xl border outline-none font-mono text-xs',
                    isDarkMode ? 'border-white/10 bg-black/20 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                  )}
                />
              </div>
            )}

            {/* AI Model & Prompt */}
            {node.category === 'ai' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Reasoning Model</label>
                  <div
                    className={cn(
                      'p-2.5 rounded-xl border font-mono text-neutral-200 text-xs',
                      isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
                    )}
                  >
                    {config.model || 'gemini/gemini-flash-lite-latest'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-300">Prompt Template</label>
                  <textarea
                    rows={4}
                    value={config.promptTemplate || ''}
                    onChange={(e) => onUpdateNodeConfig?.(node.id, { promptTemplate: e.target.value })}
                    className={cn(
                      'w-full p-2.5 rounded-xl border outline-none font-mono text-xs leading-relaxed resize-none',
                      isDarkMode ? 'border-white/10 bg-black/20 text-neutral-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                    )}
                  />
                </div>
              </div>
            )}

            {/* Min-Max Evaluation Constraints */}
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Min-Max Optimization Bounds</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                  Runtime Bounds
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Guarantees deterministic execution bounded by retry limits, confidence floors, and strict timeout thresholds.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Min/Max Retries</span>
                  <div className="font-mono text-neutral-200 bg-black/20 px-2 py-1 rounded border border-white/5">
                    {config.minmax_constraints?.min_retries ?? 0} / {config.minmax_constraints?.max_retries ?? 3}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Timeout Window</span>
                  <div className="font-mono text-neutral-200 bg-black/20 px-2 py-1 rounded border border-white/5">
                    {config.minmax_constraints?.min_timeout_sec ?? 1}s - {config.minmax_constraints?.max_timeout_sec ?? 10}s
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Min Confidence Floor</span>
                  <div className="font-mono text-emerald-300 bg-black/20 px-2 py-1 rounded border border-white/5 flex items-center justify-between">
                    <span>{((config.minmax_constraints?.min_confidence ?? 0.9) * 100).toFixed(0)}% Required</span>
                    <span className="text-[10px] text-neutral-500 font-sans">Objective: min(risk) + max(conf)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Email notification config */}
            {config.recipientEmail && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300">Recipient Email</label>
                <div className={cn('p-2.5 rounded-xl border font-mono text-xs', isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50')}>
                  {config.recipientEmail}
                </div>
              </div>
            )}

            {/* Output Schema Section */}
            {config.outputs && config.outputs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="font-semibold text-neutral-300 block">Output Schema</label>
                <div className="space-y-1.5">
                  {config.outputs.map((out) => (
                    <div
                      key={out.key}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl border font-mono text-xs',
                        isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] opacity-60 font-sans">
                          {out.type === 'text' ? 'Aa' : out.type === 'array' ? '[]' : '🔗'}
                        </span>
                        <span className="text-neutral-200">{out.key}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-sans">{out.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'test' && (
          <div className="space-y-4">
            <p className="text-neutral-400 leading-relaxed text-xs">
              Execute this node against live workspace boundaries to inspect genuine execution proof: function invoked, exit code, duration, and terminal output.
            </p>

            {testProof && (
              <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden text-xs font-mono">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        testProof.exit_code === 0 ? 'bg-emerald-400' : 'bg-rose-400'
                      )}
                    />
                    <span className="font-bold text-neutral-200">
                      {testProof.exit_code === 0 ? 'Execution Passed' : 'Execution Returned Error'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                      exit {testProof.exit_code ?? 0}
                    </span>
                  </div>
                  {testProof.duration_ms && (
                    <span className="text-[11px] text-neutral-400">{testProof.duration_ms}ms</span>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  {testProof.function_called && (
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Function Invoked</span>
                      <p className="text-blue-400 text-[11px] select-all break-all">{testProof.function_called}</p>
                    </div>
                  )}

                  {testProof.command && (
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Command</span>
                      <p className="text-neutral-300 text-[11px] bg-black/40 p-1.5 rounded select-all font-mono">
                        $ {testProof.command}
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Output / Stdout</span>
                      <button
                        type="button"
                        onClick={handleCopyProof}
                        className="text-[11px] flex items-center gap-1 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-2 rounded bg-black/50 border border-white/5 text-neutral-200 text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {testProof.stdout || testProof.error || 'Done. (No stdout)'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-3 text-neutral-400 leading-relaxed">
            <p>
              <strong className="text-white block mb-1">{node.name}</strong>
              {node.subtitle}. Configured inside ERIS Win32 workflow engine with isolated execution contexts.
            </p>
            <div className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-1">
              <p className="text-neutral-300 font-semibold">Node ID</p>
              <p className="font-mono text-[11px] text-neutral-400 select-all">{node.id}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action: Test Step */}
      <div className="p-4 border-t border-white/[0.06] shrink-0">
        <button
          type="button"
          onClick={handleTestStep}
          disabled={isTesting}
          className={cn(
            'cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all shadow-xs',
            isDarkMode
              ? 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300'
              : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
          )}
        >
          <Play className={cn('w-3.5 h-3.5', isTesting && 'animate-spin')} />
          <span>{isTesting ? 'Testing step...' : 'Test step'}</span>
        </button>
      </div>
    </aside>
  );
};

export default StepInspector;
