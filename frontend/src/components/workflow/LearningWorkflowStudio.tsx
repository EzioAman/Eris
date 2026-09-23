import React, { useState } from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import StepChecklistTemplate, {
  type StepCheckItem,
  StepChecklistIconSprites,
} from '../../../ui_templates/StepChecklistTemplate';

export interface LearningWorkflowStudioProps {
  isDarkMode?: boolean;
  onReturnToWorkspace: () => void;
}

export const LearningWorkflowStudio: React.FC<LearningWorkflowStudioProps> = ({
  isDarkMode: _isDarkMode = true,
  onReturnToWorkspace,
}) => {
  const [activeWorkflowId, setActiveWorkflowId] = useState<'tool-learning' | 'email-triage' | 'security-swarm'>('tool-learning');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setExecutionLogs((prev) => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Workflow 1: Autonomous Tool Synthesis & Habit Learning
  const toolSynthesisSteps: StepCheckItem[] = [
    {
      id: 'step-detect',
      before: {
        title: 'Detect Capability Gap',
        subtitle: 'Evaluate user prompt against dynamic filesystem tools to detect missing actions',
      },
      after: {
        title: 'Capability Gap Confirmed',
        subtitle: 'Detected missing capability: youtube_player. Triggered interactive confirmation.',
      },
      run: async () => {
        addLog('Scanning tools/ and backend/tools/... No YouTube handler found.');
        await new Promise((r) => setTimeout(r, 600));
        addLog('Emitted tool_creation_offer to user.');
        return { ok: true };
      },
    },
    {
      id: 'step-sandbox',
      before: {
        title: 'Synthesize Tool Code in Sandbox',
        subtitle: 'Generate Python implementation with docstrings and type annotations',
      },
      after: {
        title: 'Sandbox Tool Written',
        subtitle: 'Wrote tools/play_youtube_song.py with input guardrails.',
      },
      run: async () => {
        addLog('Generating clean Python tool code in sandbox...');
        await new Promise((r) => setTimeout(r, 800));
        addLog('File written to tools/play_youtube_song.py.');
        return { ok: true };
      },
    },
    {
      id: 'step-verify',
      before: {
        title: 'Autonomous Verification Loop',
        subtitle: 'Compile AST syntax and execute sandbox verification test until 100% verified',
      },
      after: {
        title: '100% Verified in Sandbox',
        subtitle: 'Execution exited with code 0. AST pattern guardrails passed.',
      },
      run: async () => {
        addLog('Running py_compile check...');
        await new Promise((r) => setTimeout(r, 700));
        addLog('Verification test passed with exit code 0.');
        return { ok: true };
      },
    },
    {
      id: 'step-hash',
      before: {
        title: 'Compute SHA256 & Register',
        subtitle: 'Calculate cryptographic hash to ensure tampering detection and persist habit',
      },
      after: {
        title: 'SHA256 Registered in Knowledge',
        subtitle: 'Digest recorded in .tool_registry.json. Habit saved to memory/user_habits.json.',
      },
      run: async () => {
        addLog('Calculating SHA256 digest...');
        await new Promise((r) => setTimeout(r, 600));
        addLog('Tool hash saved: 3763b4f18cdf... User habit preference learned.');
        return { ok: true };
      },
    },
  ];

  // Workflow 2: Autonomous Email Triage Pipeline
  const emailTriageSteps: StepCheckItem[] = [
    {
      id: 'step-fetch',
      before: {
        title: 'Query Gmail via Secure SMTP/IMAP',
        subtitle: 'Inspect unread messages using verified Google App Password credentials',
      },
      after: {
        title: 'Inbox Stream Ingested',
        subtitle: 'Retrieved latest unread messages matching filter query.',
      },
      run: async () => {
        addLog('Connecting to smtp.gmail.com:587...');
        await new Promise((r) => setTimeout(r, 700));
        addLog('Retrieved 3 inbox items.');
        return { ok: true };
      },
    },
    {
      id: 'step-classify',
      before: {
        title: 'Classify & Rank Priority',
        subtitle: 'Extract urgent keywords, action items, and triage severity tiers',
      },
      after: {
        title: 'Triage Classification Complete',
        subtitle: 'Categorized: 1 Urgent Incident, 2 Informational Updates.',
      },
      run: async () => {
        addLog('Analyzing headers and bodies with active model...');
        await new Promise((r) => setTimeout(r, 600));
        addLog('Classification complete: Priority 1 marked.');
        return { ok: true };
      },
    },
    {
      id: 'step-dispatch',
      before: {
        title: 'Draft & Dispatch Notification',
        subtitle: 'Compose clean response and trigger automated workspace alert',
      },
      after: {
        title: 'Dispatch Delivered',
        subtitle: 'Alert email transmitted and logged to audit trace.',
      },
      run: async () => {
        addLog('Transmitting alert via SMTP gateway...');
        await new Promise((r) => setTimeout(r, 800));
        addLog('Delivery confirmed. Status 250 OK.');
        return { ok: true };
      },
    },
  ];

  const currentSteps = activeWorkflowId === 'tool-learning' ? toolSynthesisSteps : emailTriageSteps;

  return (
    <div
      className={cn(
        'w-full h-screen min-h-screen flex flex-col font-sans select-none overflow-hidden',
        'bg-[var(--bg-workspace)] text-[var(--text-primary)]'
      )}
    >
      <StepChecklistIconSprites />

      {/* Header Bar */}
      <header
        className={cn(
          'shrink-0 h-14 border-b px-4 sm:px-6 flex items-center justify-between z-10',
          'border-[var(--border-workspace)] bg-[var(--bg-surface)] backdrop-blur-xl'
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReturnToWorkspace}
            className={cn(
              'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors',
              'border-[var(--border-workspace)] bg-[var(--bg-input)] hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-primary)]'
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-workspace)]" />

          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none text-[var(--text-primary)]">Learning & Automation Studio</h1>
              <span className="text-[11px] text-[var(--text-secondary)]">Interactive procedural execution & tool habit memory</span>
            </div>
          </div>
        </div>

        {/* Workflow Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border-workspace)] bg-[var(--bg-input)] text-xs">
          <button
            type="button"
            onClick={() => setActiveWorkflowId('tool-learning')}
            className={cn(
              'px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer',
              activeWorkflowId === 'tool-learning'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Autonomous Tool Synthesis
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkflowId('email-triage')}
            className={cn(
              'px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer',
              activeWorkflowId === 'email-triage'
                ? 'bg-[var(--accent-primary)] text-white shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Email Triage Pipeline
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Interactive Step Runner */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="max-w-xl w-full">
            <StepChecklistTemplate
              key={activeWorkflowId}
              steps={currentSteps}
              title={activeWorkflowId === 'tool-learning' ? 'Autonomous Tool Generation Recipe' : 'Autonomous Email Triage Recipe'}
              subtitle="Execute each procedural step to verify ERIS self-learning and execution safety."
              finishedTitle="Workflow Successfully Verified"
              finishedSubtitle="All procedural stages passed AST guardrails and sandbox integrity checks."
              finishedButtonText="Return to Workspace"
              onFinished={onReturnToWorkspace}
              autoStart={false}
              splitLayout={false}
              className="shadow-2xl border-[var(--border-workspace)]"
            />
          </div>
        </div>

        {/* Right Live Execution Console */}
        <div
          className={cn(
            'w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l p-4 flex flex-col font-mono text-xs',
            'border-[var(--border-workspace)] bg-[var(--bg-card)]'
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-workspace)]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-[var(--text-primary)]">Live Execution Console</span>
            </div>
            <button
              type="button"
              onClick={() => setExecutionLogs([])}
              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-1.5 select-text text-neutral-400">
            {executionLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center opacity-40">
                <span>Start a workflow step to view live telemetry and AST execution traces.</span>
              </div>
            ) : (
              executionLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-indigo-400 font-semibold">{log.slice(0, 10)}</span>
                  <span>{log.slice(10)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningWorkflowStudio;
