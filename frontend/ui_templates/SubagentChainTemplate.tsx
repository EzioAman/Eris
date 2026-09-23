import React, { useState } from 'react';
import { cn } from '../src/lib/utils';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  GitFork,
  ArrowRight,
} from 'lucide-react';

// ─── 1. Bespoke Custom Animated SVGs for Each Subagent Archetype ───────────

export const SecurityAuditorSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Hexagonal Shield Base */}
    <path
      d="M32 4L54 14V32C54 44.5 44.5 55.5 32 60C19.5 55.5 10 44.5 10 32V14L32 4Z"
      className="fill-rose-500/10 stroke-rose-500/80"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Inner Radar Concentric Arc */}
    <circle
      cx="32"
      cy="32"
      r="14"
      className={cn('stroke-rose-400/50', isThinking && 'animate-ping origin-center')}
      strokeWidth="1.5"
      strokeDasharray="4 4"
    />
    {/* Rotating Radar Sweep Line */}
    <g className={cn(isThinking && 'animate-spin origin-center')} style={{ animationDuration: '3s' }}>
      <line x1="32" y1="32" x2="44" y2="20" className="stroke-rose-400" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="20" r="2.5" className="fill-rose-300 animate-pulse" />
    </g>
    {/* Center Lock Core */}
    <rect x="26" y="29" width="12" height="10" rx="2" className="fill-rose-500/90 stroke-rose-300" strokeWidth="1.5" />
    <path d="M28 29V24C28 21.8 29.8 20 32 20C34.2 20 36 21.8 36 24V29" className="stroke-rose-300" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="34" r="1.5" className="fill-white" />
  </svg>
);

export const DocResearcherSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Planetary Knowledge Orb Core */}
    <circle cx="32" cy="32" r="12" className="fill-cyan-500/15 stroke-cyan-400" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="6" className="fill-cyan-400 animate-pulse" />
    {/* Orbit Ring 1 */}
    <ellipse
      cx="32"
      cy="32"
      rx="24"
      ry="8"
      className={cn('stroke-cyan-400/60', isThinking && 'animate-spin origin-center')}
      strokeWidth="1.8"
      strokeDasharray="5 3"
      style={{ animationDuration: '6s', transform: 'rotate(-25deg)' }}
    />
    {/* Orbit Ring 2 */}
    <ellipse
      cx="32"
      cy="32"
      rx="24"
      ry="8"
      className={cn('stroke-sky-400/70', isThinking && 'animate-spin origin-center')}
      strokeWidth="1.8"
      style={{ animationDuration: '4s', transform: 'rotate(45deg)' }}
    />
    {/* Satellite Beacon */}
    <circle cx="52" cy="24" r="3" className="fill-cyan-300 animate-ping" />
    <circle cx="12" cy="40" r="2.5" className="fill-sky-300" />
  </svg>
);

export const CodeReviewerSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Rounded Card Frame */}
    <rect x="8" y="10" width="48" height="44" rx="8" className="fill-violet-500/10 stroke-violet-400/80" strokeWidth="2.5" />
    {/* Header Dots */}
    <circle cx="16" cy="18" r="2" className="fill-rose-400" />
    <circle cx="22" cy="18" r="2" className="fill-amber-400" />
    <circle cx="28" cy="18" r="2" className="fill-emerald-400" />
    {/* Code Brackets */}
    <path d="M22 28L15 35L22 42" className="stroke-violet-300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 28L49 35L42 42" className="stroke-violet-300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="35" y1="27" x2="29" y2="43" className="stroke-violet-400" strokeWidth="2.2" strokeLinecap="round" />
    {/* Animated Scanner Laser */}
    {isThinking && (
      <line
        x1="12"
        y1="35"
        x2="52"
        y2="35"
        className="stroke-cyan-400/80 animate-pulse"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
    )}
  </svg>
);

export const RefactorAgentSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Large Gear */}
    <g className={cn(isThinking && 'animate-spin origin-center')} style={{ animationDuration: '8s' }}>
      <circle cx="28" cy="28" r="14" className="fill-amber-500/10 stroke-amber-400" strokeWidth="2" strokeDasharray="6 4" />
      <circle cx="28" cy="28" r="5" className="fill-amber-400/80" />
    </g>
    {/* Interlocking Small Gear */}
    <g className={cn(isThinking && 'animate-spin origin-center')} style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
      <circle cx="44" cy="42" r="10" className="fill-orange-500/15 stroke-orange-400" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="44" cy="42" r="3.5" className="fill-orange-400" />
    </g>
    {/* Dynamic Connection Particle */}
    <path d="M34 32L38 38" className="stroke-amber-300 animate-pulse" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const PerformanceOptimizerSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Tachometer Arc */}
    <path
      d="M12 44C12 28.5 21 16 32 16C43 16 52 28.5 52 44"
      className="stroke-emerald-400/30"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M12 44C12 28.5 21 16 32 16"
      className="stroke-emerald-400"
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray="2 4"
    />
    {/* Center Hub */}
    <circle cx="32" cy="42" r="4.5" className="fill-emerald-400 stroke-white" strokeWidth="1.5" />
    {/* Sweeping Needle */}
    <g className={cn(isThinking && 'origin-bottom animate-bounce')} style={{ transformOrigin: '32px 42px' }}>
      <line x1="32" y1="42" x2="44" y2="24" className="stroke-emerald-300" strokeWidth="3" strokeLinecap="round" />
      <polygon points="44,24 42,20 46,22" className="fill-emerald-200" />
    </g>
    {/* Speed Spark Particles */}
    <circle cx="46" cy="18" r="2" className="fill-emerald-400 animate-ping" />
    <circle cx="20" cy="22" r="1.5" className="fill-teal-300" />
  </svg>
);

export const TesterAgentSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Erlenmeyer Flask Body */}
    <path
      d="M27 10H37V22L49 46C51.5 50.5 48.5 56 43 56H21C15.5 56 12.5 50.5 15 46L27 22V10Z"
      className="fill-blue-500/10 stroke-blue-400"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Flask Lip */}
    <line x1="25" y1="10" x2="39" y2="10" className="stroke-blue-300" strokeWidth="2.5" strokeLinecap="round" />
    {/* Liquid Fill */}
    <path d="M19 46L24 36H40L45 46C46 48 44.5 51 42 51H22C19.5 51 18 48 19 46Z" className="fill-blue-400/40" />
    {/* Rising Bubbles */}
    <circle cx="28" cy="42" r="2" className={cn('fill-blue-200', isThinking && 'animate-ping')} style={{ animationDuration: '2s' }} />
    <circle cx="36" cy="38" r="2.5" className={cn('fill-cyan-200', isThinking && 'animate-pulse')} />
    <circle cx="32" cy="28" r="1.5" className={cn('fill-white', isThinking && 'animate-bounce')} />
  </svg>
);

export const CustomWorkerSvg: React.FC<{ className?: string; isThinking?: boolean }> = ({
  className = 'w-10 h-10',
  isThinking = true,
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
    {/* Nucleus Core */}
    <circle cx="32" cy="32" r="6" className="fill-teal-400 animate-pulse" />
    {/* 3 Elliptical Orbit Paths */}
    <ellipse cx="32" cy="32" rx="22" ry="7" className={cn('stroke-teal-400/60', isThinking && 'animate-spin origin-center')} strokeWidth="1.5" style={{ animationDuration: '5s' }} />
    <ellipse cx="32" cy="32" rx="22" ry="7" className={cn('stroke-indigo-400/60', isThinking && 'animate-spin origin-center')} strokeWidth="1.5" style={{ animationDuration: '7s', transform: 'rotate(60deg)' }} />
    <ellipse cx="32" cy="32" rx="22" ry="7" className={cn('stroke-emerald-400/60', isThinking && 'animate-spin origin-center')} strokeWidth="1.5" style={{ animationDuration: '9s', transform: 'rotate(120deg)' }} />
    {/* Electrons */}
    <circle cx="50" cy="32" r="2.5" className="fill-teal-200" />
    <circle cx="20" cy="42" r="2" className="fill-indigo-200" />
  </svg>
);

// ─── 2. Subagents Metadata Catalog ─────────────────────────────────────────

export interface SubagentMetadata {
  role: string;
  title: string;
  category: string;
  color: string;
  borderColor: string;
  bgLight: string;
  bgDark: string;
  description: string;
  capabilities: string[];
  svg: React.ComponentType<{ className?: string; isThinking?: boolean }>;
}

export const SUBAGENT_CATALOG: SubagentMetadata[] = [
  {
    role: 'SecurityAuditor',
    title: 'Security Auditor',
    category: 'Penetration & Defense',
    color: 'text-rose-500 dark:text-rose-400',
    borderColor: 'border-rose-500/40',
    bgLight: 'bg-rose-50',
    bgDark: 'bg-rose-500/10',
    description: 'Autonomous AST injection auditor, permission containment verification, and sandbox integrity checks.',
    capabilities: ['AST injection defense', 'Directory traversal defense', 'Command filter audit', 'Timeout checks'],
    svg: SecurityAuditorSvg,
  },
  {
    role: 'DocResearcher',
    title: 'Documentation Researcher',
    category: 'Knowledge & Web Scraping',
    color: 'text-cyan-500 dark:text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgLight: 'bg-cyan-50',
    bgDark: 'bg-cyan-500/10',
    description: 'Crawls official documentation, queries web search, and synthesizes clean markdown reports into doc/.',
    capabilities: ['Official doc scraping', 'Live web search', 'API spec validation', 'Markdown report synthesis'],
    svg: DocResearcherSvg,
  },
  {
    role: 'CodeReviewer',
    title: 'Code Reviewer',
    category: 'Architecture & Quality',
    color: 'text-violet-500 dark:text-violet-400',
    borderColor: 'border-violet-500/40',
    bgLight: 'bg-violet-50',
    bgDark: 'bg-violet-500/10',
    description: 'Detects architectural anti-patterns, missing TypeScript types, unhandled promises, and AI-slop violations.',
    capabilities: ['Anti-pattern scan', 'TypeScript compile verification', 'AI-slop inspection', 'Clean code audit'],
    svg: CodeReviewerSvg,
  },
  {
    role: 'RefactorAgent',
    title: 'Refactor Agent',
    category: 'Structural Decoupling',
    color: 'text-amber-500 dark:text-amber-400',
    borderColor: 'border-amber-500/40',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-500/10',
    description: 'Performs surgical code refactoring, modular decomposition, and component deduplication.',
    capabilities: ['Modular decomposition', 'Component extraction', 'DRY deduplication', 'Clean API contracts'],
    svg: RefactorAgentSvg,
  },
  {
    role: 'PerformanceOptimizer',
    title: 'Performance Optimizer',
    category: 'Throughput & Profiling',
    color: 'text-emerald-500 dark:text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-500/10',
    description: 'Profiles React render times, token throughput, bundle sizes, and memory leaks.',
    capabilities: ['Render cycle profiling', 'Token throughput tuning', 'Bundle size compression', 'Memory leak tracking'],
    svg: PerformanceOptimizerSvg,
  },
  {
    role: 'TesterAgent',
    title: 'Tester Agent',
    category: 'Automated Invariants',
    color: 'text-blue-500 dark:text-blue-400',
    borderColor: 'border-blue-500/40',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-500/10',
    description: 'Generates and runs automated verification scripts, regression testing suites, and lifecycle state-machine audits.',
    capabilities: ['Lifecycle state audits', 'Regression suite runs', 'Idempotency checks', 'Unit test generation'],
    svg: TesterAgentSvg,
  },
  {
    role: 'CustomWorker',
    title: 'Custom Worker',
    category: 'Dynamic Swarm Dispatch',
    color: 'text-teal-500 dark:text-teal-400',
    borderColor: 'border-teal-500/40',
    bgLight: 'bg-teal-50',
    bgDark: 'bg-teal-500/10',
    description: 'Arbitrary on-demand worker dynamically created for specialized, user-defined objectives.',
    capabilities: ['Dynamic role assignment', 'Isolated sub-prompt', 'Domain-specific reasoning', 'Autonomous handoff'],
    svg: CustomWorkerSvg,
  },
];

// ─── 3. Linked Chain vs Parallel Chain Interactive Visualizer ─────────────

export interface ChainStep {
  id: string;
  role: string;
  objective: string;
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
  duration?: string;
  report?: string;
}

export interface SubagentChainTemplateProps {
  steps?: ChainStep[];
  defaultView?: 'linked' | 'parallel';
  isDarkMode?: boolean;
  onSelectAgent?: (role: string) => void;
}

export const SubagentChainTemplate: React.FC<SubagentChainTemplateProps> = ({
  steps: customSteps,
  defaultView = 'parallel',
  isDarkMode = true,
  onSelectAgent,
}) => {
  const [chainMode, setChainMode] = useState<'linked' | 'parallel'>(defaultView);
  const [selectedAgentRole, setSelectedAgentRole] = useState<string>('SecurityAuditor');

  // If custom runtime steps are passed, use them; otherwise populate standard chain
  const activeSteps: ChainStep[] =
    customSteps && customSteps.length > 0
      ? customSteps
      : [
          { id: '1', role: 'SecurityAuditor', objective: 'Audit AST guardrails & path traversal', status: 'completed', duration: '1.2s', report: 'Zero AST bypasses. Workspace root strict containment verified.' },
          { id: '2', role: 'DocResearcher', objective: 'Verify official tools documentation & APIs', status: 'completed', duration: '2.1s', report: 'Scraped and indexed active API schemas into knowledge base.' },
          { id: '3', role: 'CodeReviewer', objective: 'Check TypeScript strict types & zero AI-slop', status: 'thinking', duration: '3.4s' },
          { id: '4', role: 'TesterAgent', objective: 'Execute regression suite & lifecycle audits', status: 'idle' },
        ];

  const selectedMeta = SUBAGENT_CATALOG.find((s) => s.role === selectedAgentRole) || SUBAGENT_CATALOG[0];
  const SelectedSvg = selectedMeta.svg;

  return (
    <div
      className={cn(
        'w-full my-3 p-4 rounded-2xl border transition-all select-text font-sans shadow-lg',
        isDarkMode
          ? 'bg-[#0E121B]/95 border-white/10 text-neutral-100 shadow-black/40'
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
      )}
    >
      {/* Header Toolbar & Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">ERIS Subagent Swarm Ecosystem</h3>
            <p className="text-[11px] opacity-60">7 Autonomous Archetypes with Real-Time Chain Reasoning</p>
          </div>
        </div>

        {/* Linked vs Parallel Mode Toggle Buttons */}
        <div className="flex items-center bg-black/20 dark:bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setChainMode('linked')}
            className={cn(
              'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
              chainMode === 'linked'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Linked Chain</span>
          </button>
          <button
            type="button"
            onClick={() => setChainMode('parallel')}
            className={cn(
              'cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
              chainMode === 'parallel'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Parallel Swarm</span>
          </button>
        </div>
      </div>

      {/* ─── LINKED CHAIN VIEW (Sequential Dependency Flow) ─── */}
      {chainMode === 'linked' && (
        <div className="py-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[560px] pb-2">
            {activeSteps.map((step, idx) => {
              const meta = SUBAGENT_CATALOG.find((s) => s.role === step.role) || SUBAGENT_CATALOG[6];
              const SvgComp = meta.svg;
              const isThinking = step.status === 'thinking';
              const isCompleted = step.status === 'completed';

              return (
                <React.Fragment key={step.id}>
                  {/* Step Card Node */}
                  <div
                    onClick={() => {
                      setSelectedAgentRole(step.role);
                      onSelectAgent?.(step.role);
                    }}
                    className={cn(
                      'cursor-pointer relative flex flex-col p-3 rounded-xl border transition-all w-52 shrink-0 group',
                      selectedAgentRole === step.role
                        ? 'ring-2 ring-cyan-500/70 border-cyan-500 shadow-md'
                        : isDarkMode
                        ? 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <SvgComp className="w-8 h-8" isThinking={isThinking} />
                      <span
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded-full uppercase font-bold flex items-center gap-1',
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isThinking
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-neutral-500/15 text-neutral-400 border border-neutral-500/30'
                        )}
                      >
                        {isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {isThinking && <Clock className="w-2.5 h-2.5 animate-spin" />}
                        {step.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold truncate">{meta.title}</p>
                    <p className="text-[11px] opacity-70 mt-1 line-clamp-2 leading-relaxed">{step.objective}</p>

                    {step.duration && (
                      <span className="text-[10px] font-mono opacity-50 mt-2">Time: {step.duration}</span>
                    )}
                  </div>

                  {/* Animated Connecting Conduit Arrow */}
                  {idx < activeSteps.length - 1 && (
                    <div className="flex items-center justify-center shrink-0 px-1">
                      <div className="relative flex items-center">
                        <ArrowRight
                          className={cn(
                            'w-5 h-5 transition-colors',
                            isCompleted ? 'text-emerald-400' : 'text-neutral-500/60'
                          )}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── PARALLEL CHAIN VIEW (Swarm Coordinator & Concurrent Lanes) ─── */}
      {chainMode === 'parallel' && (
        <div className="py-4 space-y-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-semibold text-cyan-300">Swarm Coordinator Hub</span>
              <span className="opacity-70">— Concurrent Async Execution Pool (`asyncio.gather`)</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
              {SUBAGENT_CATALOG.length} Archetypes Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {SUBAGENT_CATALOG.map((meta) => {
              const SvgComp = meta.svg;
              const isSelected = selectedAgentRole === meta.role;

              return (
                <div
                  key={meta.role}
                  onClick={() => {
                    setSelectedAgentRole(meta.role);
                    onSelectAgent?.(meta.role);
                  }}
                  className={cn(
                    'cursor-pointer p-3 rounded-xl border transition-all flex items-start gap-3 select-none group',
                    isSelected
                      ? 'ring-2 ring-cyan-500/80 border-cyan-500 bg-cyan-500/5 shadow-md'
                      : isDarkMode
                      ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  )}
                >
                  <SvgComp className="w-10 h-10 shrink-0" isThinking={true} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold truncate group-hover:text-cyan-400 transition-colors">
                        {meta.title}
                      </p>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-white/10 opacity-75">
                        {meta.category.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-70 mt-1 line-clamp-2 leading-relaxed">{meta.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Selected Subagent Inspection Detail Card ─── */}
      <div
        className={cn(
          'mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs',
          isDarkMode ? 'bg-black/30 border-white/10' : 'bg-slate-100/70 border-slate-200'
        )}
      >
        <div className="flex items-center gap-3">
          <SelectedSvg className="w-9 h-9 shrink-0" isThinking={true} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{selectedMeta.title}</span>
              <span className="font-mono text-[10px] text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                [SPAWN_AGENT: {selectedMeta.role}|&lt;objective&gt;]
              </span>
            </div>
            <p className="opacity-70 mt-0.5">{selectedMeta.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedMeta.capabilities.map((cap, cIdx) => (
            <span
              key={cIdx}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 border border-white/10 text-neutral-300"
            >
              ✓ {cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubagentChainTemplate;
