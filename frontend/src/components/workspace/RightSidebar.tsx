import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  KeyRound,
  Plug,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ConnectorItem } from './chatTypes';
import type { PluginItem } from './PluginConfigModal';
import { SkeletonTemplate } from '../../../ui_templates/SkeletonTemplate';

export interface RightSidebarProps {
  isDarkMode: boolean;
  showRightSidebar: boolean;
  connectors?: ConnectorItem[];
  plugins?: PluginItem[];
  onToggleConnector?: (id: string) => void;
  onTogglePlugin?: (plugin: PluginItem) => void;
  onConfigurePlugin?: (plugin: PluginItem) => void;
  onClose: () => void;
  onOpen?: () => void;
  activeTab: 'connectors' | 'plugins' | 'tools';
  onTabChange: (tab: 'connectors' | 'plugins' | 'tools') => void;
  onOpenModelConfig?: () => void;
  width?: number;
  tools?: AntigravityToolSpec[];
}

export const DynamicConnectorLogo: React.FC<{ icon?: string; name: string; isDarkMode?: boolean }> = ({
  icon,
  name,
}) => {
  const normalized = (icon || name || '').toLowerCase();

  if (normalized.includes('git') && !normalized.includes('hub')) {
    return (
      <img
        src="/icons/git.png"
        alt="Git"
        className="w-3.5 h-3.5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  if (normalized.includes('sandbox') || normalized.includes('terminal')) {
    return (
      <img
        src="/icons/terminal.png"
        alt="Terminal"
        className="w-3.5 h-3.5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  if (normalized.includes('github') || normalized === 'gh') {
    return (
      <img
        src="/icons/github.png"
        alt="GitHub"
        className="w-3.5 h-3.5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  if (normalized.includes('gmail') || normalized.includes('mail') || normalized.includes('email')) {
    return (
      <img
        src="/icons/gmail.png"
        alt="Gmail"
        className="w-3.5 h-3.5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  if (normalized.includes('notion')) {
    return (
      <img
        src="/icons/notion.png"
        alt="Notion"
        className="w-3.5 h-3.5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  if (normalized.includes('search') || normalized.includes('web')) {
    return (
      <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }

  return <Plug className="w-3.5 h-3.5 text-cyan-400" />;
};

export interface TestExecutionDetails {
  id: string;
  ok: boolean;
  msg: string;
  function_called?: string;
  command?: string;
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  latency_ms?: number;
}

export interface AntigravityToolSpec {
  id: string;
  name: string;
  category: string;
  severity: 'SAFE' | 'MUTATING' | 'DANGEROUS';
  approvalRequired: boolean;
  description: string;
  format: string;
  status?: string;
  current_hash?: string;
  source?: string;
}

export const ANTIGRAVITY_TOOLS_REGISTRY: AntigravityToolSpec[] = [
  {
    id: 'view_file',
    name: 'VIEW_FILE',
    category: 'Inspection',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Read sliced file lines with 1-indexed bounds within workspace boundary.',
    format: '[VIEW_FILE: <path> <start> <end>]',
  },
  {
    id: 'list_dir',
    name: 'LIST_DIR',
    category: 'Inspection',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Index directory entries, sizes, and file types safely.',
    format: '[LIST_DIR: <path>]',
  },
  {
    id: 'grep_search',
    name: 'GREP_SEARCH',
    category: 'Search',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Fast regex search matching exact lines and patterns across code files.',
    format: '[GREP_SEARCH: <pattern> <path>]',
  },
  {
    id: 'search_web',
    name: 'SEARCH_WEB',
    category: 'Network',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Execute public web search query via DuckDuckGo lite parser.',
    format: '[SEARCH_WEB: <query>]',
  },
  {
    id: 'read_url_content',
    name: 'READ_URL_CONTENT',
    category: 'Network',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Fetch and parse public HTTP/HTTPS URL into clean Markdown text.',
    format: '[SCRAPE_WEB: <url>]',
  },
  {
    id: 'scratchpad',
    name: 'SCRATCHPAD',
    category: 'Reasoning',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Read/write persistent multi-turn reasoning notes during prompt chaining.',
    format: '[SCRATCHPAD: read|write <notes>]',
  },
  {
    id: 'git',
    name: 'GIT',
    category: 'Version Control',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Inspect status, diff, branches, commit logs safely without shell escalation.',
    format: '[GIT: status|diff|log]',
  },
  {
    id: 'write_file',
    name: 'WRITE_FILE',
    category: 'Mutating',
    severity: 'MUTATING',
    approvalRequired: false,
    description: 'Create or update files in workspace with AST validation and containment checks.',
    format: '[WRITE_FILE: <path> <code>]',
  },
  {
    id: 'schedule',
    name: 'SCHEDULE',
    category: 'Orchestration',
    severity: 'MUTATING',
    approvalRequired: false,
    description: 'Schedule one-shot timer or recurring cron job notifications in background.',
    format: '[SCHEDULE: <seconds|cron> <prompt>]',
  },
  {
    id: 'manage_task',
    name: 'MANAGE_TASK',
    category: 'Lifecycle',
    severity: 'SAFE',
    approvalRequired: false,
    description: 'Inspect status, send input, or cancel running background tasks.',
    format: '[MANAGE_TASK: list|status|kill <id>]',
  },
  {
    id: 'run_command',
    name: 'RUN_COMMAND',
    category: 'Shell Execution',
    severity: 'DANGEROUS',
    approvalRequired: true,
    description: 'Execute sandboxed PowerShell commands with AST pattern guardrails.',
    format: '[RUN_COMMAND: <command>]',
  },
  {
    id: 'send_email',
    name: 'SEND_EMAIL',
    category: 'Integration',
    severity: 'DANGEROUS',
    approvalRequired: true,
    description: 'Dispatch alert emails via authenticated Google App Password SMTP.',
    format: '[EMAIL: <to>|<subject>|<body>]',
  },
  {
    id: 'spawn_agent',
    name: 'SPAWN_AGENT',
    category: 'Autonomous Swarm',
    severity: 'DANGEROUS',
    approvalRequired: true,
    description: 'Fork autonomous specialized subagents to divide complex audits in parallel.',
    format: '[SPAWN_AGENT: <role>|<objective>]',
  },
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isDarkMode,
  showRightSidebar,
  connectors: _connectors = [],
  plugins = [],
  onToggleConnector: _onToggleConnector,
  onTogglePlugin,
  onConfigurePlugin,
  onClose,
  activeTab,
  onTabChange,
  width,
  tools: propTools = [],
}) => {
  const [testingPluginId, setTestingPluginId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestExecutionDetails | null>(null);
  const [showTestDetails, setShowTestDetails] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [showAllPlugins, setShowAllPlugins] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const [toolFilter, setToolFilter] = useState<'ALL' | 'SAFE' | 'MUTATING' | 'DANGEROUS'>('ALL');
  const [toolsList, setToolsList] = useState<AntigravityToolSpec[]>(propTools);
  const [isLoadingTools, setIsLoadingTools] = useState(!propTools || propTools.length === 0);

  React.useEffect(() => {
    if (propTools && propTools.length > 0) {
      setToolsList(propTools);
      setIsLoadingTools(false);
      return;
    }

    let mounted = true;
    setIsLoadingTools(true);
    fetch('/api/tools')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.ok && Array.isArray(data.tools)) {
          setToolsList(data.tools);
        }
      })
      .catch(() => {
        if (mounted) setToolsList(ANTIGRAVITY_TOOLS_REGISTRY);
      })
      .finally(() => {
        if (mounted) setIsLoadingTools(false);
      });
    return () => {
      mounted = false;
    };
  }, [propTools?.length]);

  if (!showRightSidebar) return null;

  const handleTestPlugin = async (pluginId: string) => {
    setTestingPluginId(pluginId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/plugins/${pluginId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          id: pluginId,
          ok: true,
          msg: data.message || `Tested successfully (${data.latency_ms}ms)`,
          function_called: data.function_called,
          command: data.command,
          exit_code: data.exit_code,
          stdout: data.stdout,
          stderr: data.stderr,
          latency_ms: data.latency_ms,
        });
        setShowTestDetails(true);
      } else {
        setTestResult({
          id: pluginId,
          ok: false,
          msg: data.error || 'Connection failed.',
          function_called: data.function_called,
          command: data.command,
          exit_code: data.exit_code,
          stdout: data.stdout,
          stderr: data.stderr,
          latency_ms: data.latency_ms,
        });
        setShowTestDetails(true);
      }
    } catch {
      setTestResult({ id: pluginId, ok: false, msg: 'Unable to reach backend plugin test endpoint.' });
    } finally {
      setTestingPluginId(null);
    }
  };

  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const toggleToolsExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      style={width ? { width } : undefined}
      className={cn(
        'shrink-0 border-l flex flex-col z-20 select-none font-sans transition-colors duration-150 overflow-hidden',
        width ? '' : 'w-80',
        'border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
      )}
    >
      {/* Header Tabs */}
      <div
        className={cn(
          'shrink-0 px-3 py-2.5 border-b flex items-center justify-between gap-2',
          isDarkMode ? 'border-white/[0.06]' : 'border-[var(--border-workspace)]'
        )}
      >
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border-workspace)] bg-[var(--bg-input)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => onTabChange('plugins')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer',
              activeTab === 'plugins' || activeTab === 'connectors'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-workspace)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Plugins
          </button>
          <button
            type="button"
            onClick={() => onTabChange('tools')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer',
              activeTab === 'tools'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-workspace)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Tools
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Collapse right sidebar"
          aria-label="Collapse right sidebar"
          className="p-1.5 rounded-lg transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-workspace)]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M15 3v18" />
            <path d="m9 9 3 3-3 3" />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* Real Test Execution Inspector Banner */}
        {testResult && (
          <div
            className={cn(
              'rounded-xl border p-3 mb-2.5 transition-all text-xs space-y-2',
              testResult.ok
                ? isDarkMode
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                  : 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                : isDarkMode
                ? 'border-red-500/30 bg-red-950/20 text-red-200'
                : 'border-red-200 bg-red-50/80 text-red-900'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0',
                    testResult.ok ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                />
                <span className="font-semibold text-xs">
                  {testResult.ok ? 'Verification Passed' : 'Verification Failed'}
                </span>
                {testResult.latency_ms && (
                  <span className="text-[11px] opacity-60 font-mono">
                    ({testResult.latency_ms}ms)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            <p className="text-xs opacity-90 leading-snug">{testResult.msg}</p>

            {/* Execution Inspector Toggle */}
            {(testResult.command || testResult.stdout || testResult.stderr) && (
              <div className="pt-1.5 border-t border-black/10 dark:border-white/10 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowTestDetails((prev) => !prev)}
                  className="flex items-center justify-between w-full text-[11px] font-mono opacity-75 hover:opacity-100 cursor-pointer"
                >
                  <span>{showTestDetails ? 'Hide Execution Proof' : 'View Execution Proof & Output'}</span>
                  {showTestDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>

                {showTestDetails && (
                  <div className="space-y-1.5 animate-in fade-in duration-100">
                    {testResult.command && (
                      <div className="flex items-center justify-between gap-1 text-[11px] font-mono bg-black/10 dark:bg-black/40 px-2 py-1 rounded">
                        <span className="truncate">$ {testResult.command}</span>
                        <span
                          className={cn(
                            'text-[10px] px-1 py-0.2 rounded font-bold shrink-0',
                            testResult.exit_code === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          code {testResult.exit_code ?? 0}
                        </span>
                      </div>
                    )}

                    {(testResult.stdout || testResult.stderr) && (
                      <div className="relative">
                        <pre className="p-2 rounded bg-black/20 dark:bg-black/60 text-[11px] font-mono leading-tight max-h-32 overflow-y-auto whitespace-pre-wrap select-text">
                          {testResult.stdout || testResult.stderr}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyOutput(testResult.stdout || testResult.stderr || '')}
                          className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 hover:bg-white/20 text-neutral-300 cursor-pointer"
                        >
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'plugins' || activeTab === 'connectors') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-0.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Installed Plugins
                </h3>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {plugins.filter((p) => p.is_enabled).length} of {plugins.length} active
                </span>
              </div>
              {plugins.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllPlugins((prev) => !prev)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{showAllPlugins ? 'Show fewer' : `Show all (${plugins.length})`}</span>
                  {showAllPlugins ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Compact List of Real Plugins with Skeleton Loader */}
            {plugins.length === 0 ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-xl border space-y-2',
                      isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-[var(--border-workspace)] bg-[var(--bg-card)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <SkeletonTemplate className={cn("h-4 w-24", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
                      <SkeletonTemplate className={cn("h-4 w-10 rounded-full", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
                    </div>
                    <SkeletonTemplate className={cn("h-3 w-full", isDarkMode ? "bg-white/5" : "bg-slate-200/70")} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(showAllPlugins ? plugins : plugins.slice(0, 3)).map((plugin) => {
                const isEnabled = plugin.is_enabled;
                const isToolsOpen = expandedTools[plugin.id];

                return (
                  <div
                    key={plugin.id}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all shadow-2xs',
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        : 'border-[var(--border-workspace)] bg-[var(--bg-card)] hover:bg-[var(--bg-input)]'
                    )}
                  >
                    {/* Header Row: Icon + Name + Status Dot + Quick Actions + Toggle */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            'size-6 rounded-md flex items-center justify-center shrink-0 border shadow-2xs',
                            isDarkMode ? 'border-white/15 bg-white/5' : 'border-[var(--border-workspace)] bg-[var(--bg-input)]'
                          )}
                        >
                          <DynamicConnectorLogo name={plugin.name} isDarkMode={isDarkMode} />
                        </div>
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate block leading-tight text-[var(--text-primary)]">
                            {plugin.name}
                          </span>
                          <span
                            className={cn(
                              'size-1.5 rounded-full shrink-0',
                              isEnabled ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-neutral-600'
                            )}
                            title={isEnabled ? 'Active & Ready' : 'Disabled'}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Dependency Config Trigger */}
                        {plugin.dependency && (
                          <button
                            type="button"
                            onClick={() => onConfigurePlugin?.(plugin)}
                            title={plugin.is_configured ? 'Configured (Click to edit)' : 'Credentials Required'}
                            className={cn(
                              'p-1 rounded hover:bg-white/10 transition-colors cursor-pointer',
                              plugin.is_configured ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 animate-pulse'
                            )}
                          >
                            <KeyRound className="w-3 h-3" />
                          </button>
                        )}

                        {/* Quick Test */}
                        <button
                          type="button"
                          disabled={testingPluginId === plugin.id}
                          onClick={() => handleTestPlugin(plugin.id)}
                          title="Test plugin connectivity"
                          className={cn(
                            'text-[11px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer border',
                            isDarkMode
                              ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10'
                              : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                          )}
                        >
                          {testingPluginId === plugin.id ? '...' : 'Test'}
                        </button>

                        {/* Switch Toggle */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          onClick={() => {
                            if (onTogglePlugin) {
                              onTogglePlugin(plugin);
                            } else if (_onToggleConnector) {
                              _onToggleConnector(plugin.id);
                            }
                          }}
                          className={cn(
                            'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                            isEnabled
                              ? 'bg-blue-600'
                              : isDarkMode
                              ? 'bg-neutral-700'
                              : 'bg-slate-300'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                              isEnabled ? 'translate-x-3' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Usage & Purpose Line */}
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
                      {plugin.usage}
                    </p>

                    {/* Expandable Tools Toggle */}
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)] font-mono">
                        {plugin.tools?.length || 0} tools registered
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleToolsExpand(plugin.id)}
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <span>{isToolsOpen ? 'Hide tools' : 'View tools'}</span>
                        {isToolsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Expandable Tools Drawer */}
                    {isToolsOpen && plugin.tools && (
                      <div className="mt-1.5 pt-1.5 border-t border-[var(--border-workspace)] space-y-1 text-xs">
                        {plugin.tools.map((t, idx) => (
                          <div key={t.name} className="flex items-start gap-1.5 leading-snug">
                            <span className="font-mono text-blue-500 font-bold shrink-0">{idx + 1}.</span>
                            <div className="min-w-0">
                              <span className="font-mono font-medium text-[var(--text-primary)]">{t.name}: </span>
                              <span className="text-[var(--text-secondary)]">{t.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-0.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Registered tools
                </h3>
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Verified tools • MUTATING: Modifies files or state
                </span>
              </div>
              {toolsList.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllTools((prev) => !prev)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{showAllTools ? 'Show fewer' : `Show all (${toolsList.length})`}</span>
                  {showAllTools ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border-workspace)] bg-[var(--bg-input)] text-[11px]">
              {(['ALL', 'SAFE', 'MUTATING', 'DANGEROUS'] as const).map((sev) => {
                const tooltip =
                  sev === 'SAFE'
                    ? 'Read-only inspections (no disk or state changes)'
                    : sev === 'MUTATING'
                    ? 'State & file modifying operations (writes, edits, configs)'
                    : sev === 'DANGEROUS'
                    ? 'Arbitrary shell commands & external side-effects (requires human approval)'
                    : 'All registered tools';

                return (
                  <button
                    key={sev}
                    type="button"
                    title={tooltip}
                    onClick={() => setToolFilter(sev)}
                    className={cn(
                      'flex-1 py-1 px-1.5 rounded-md text-center font-semibold transition-all cursor-pointer',
                      toolFilter === sev
                        ? isDarkMode
                          ? 'bg-white/10 text-white font-bold'
                          : 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-bold border border-[var(--border-workspace)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
                    )}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>

            {/* Tools List with Skeleton Loading */}
            {isLoadingTools ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-xl border space-y-2',
                      isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-[var(--border-workspace)] bg-[var(--bg-card)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <SkeletonTemplate className={cn("h-4 w-28", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
                      <SkeletonTemplate className={cn("h-4 w-14 rounded-full", isDarkMode ? "bg-white/10" : "bg-slate-200")} />
                    </div>
                    <SkeletonTemplate className={cn("h-3 w-full", isDarkMode ? "bg-white/5" : "bg-slate-200/70")} />
                    <SkeletonTemplate className={cn("h-3 w-3/4", isDarkMode ? "bg-white/5" : "bg-slate-200/70")} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(showAllTools
                  ? toolsList.filter((t) => toolFilter === 'ALL' || t.severity === toolFilter)
                  : toolsList.filter((t) => toolFilter === 'ALL' || t.severity === toolFilter).slice(0, 4)
                ).map((tool) => {
                  const isSafe = tool.severity === 'SAFE';
                  const isMutating = tool.severity === 'MUTATING';
                  const isDangerous = tool.severity === 'DANGEROUS';

                return (
                  <div
                    key={tool.id}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs space-y-1.5 transition-all shadow-2xs',
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        : 'border-[var(--border-workspace)] bg-[var(--bg-card)] hover:bg-[var(--bg-input)]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {tool.name}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded border font-mono font-medium",
                          isDarkMode ? "text-neutral-300 border-white/10 bg-white/5" : "text-[var(--text-secondary)] border-[var(--border-workspace)] bg-[var(--bg-input)]"
                        )}>
                          {tool.category}
                        </span>
                      </div>

                      {/* Severity Pill */}
                      <span
                        className={cn(
                          'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border',
                          isSafe && (isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-600/40 bg-emerald-50 text-emerald-800 font-extrabold'),
                          isMutating && (isDarkMode ? 'border-amber-500/30 bg-amber-500/15 text-amber-400 font-extrabold' : 'border-amber-600/40 bg-amber-50 text-amber-900 font-extrabold'),
                          isDangerous && (isDarkMode ? 'border-rose-500/30 bg-rose-500/15 text-rose-400 font-extrabold' : 'border-rose-600/40 bg-rose-50 text-rose-900 font-extrabold')
                        )}
                        title={tool.approvalRequired ? 'Requires User Approval Before Run' : 'Auto Executable'}
                      >
                        {tool.severity}
                      </span>
                    </div>

                    <p className="text-[11px] leading-snug font-medium text-[var(--text-secondary)]">
                      {tool.description}
                    </p>

                    <div className={cn("pt-1 border-t flex items-center justify-between", isDarkMode ? "border-white/5" : "border-[var(--border-workspace)]")}>
                      <code className={cn("text-[10px] font-mono font-semibold truncate max-w-[200px]", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                        {tool.format}
                      </code>
                      <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                        {tool.approvalRequired ? 'Manual Approval' : 'Auto Allowed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
export default RightSidebar;
