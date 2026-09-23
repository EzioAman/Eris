import type { WorkflowPipeline, StepPaletteItem } from './workflowTypes';

export const DEFAULT_DEVELOPER_PIPELINE: WorkflowPipeline = {
  id: 'wf-autonomous-dev-audit',
  title: 'Autonomous Workspace Audit & Min-Max Dispatch',
  description: 'Inspects repository health, validates sandbox boundary, evaluates code divergence with Min-Max optimization, and dispatches verified telemetry.',
  status: 'active',
  lastSaved: 'Today at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  minmax_optimization_score: 0.92,
  nodes: [
    {
      id: 'node-git-check',
      name: 'Git Workspace Health',
      subtitle: 'Inspect repository status and current branch',
      icon: 'git',
      category: 'git',
      status: 'completed',
      config: {
        gitSubcommand: 'status',
        minmax_constraints: {
          min_retries: 0,
          max_retries: 2,
          min_timeout_sec: 1,
          max_timeout_sec: 8,
          min_confidence: 0.95,
        },
        execution_output: {
          function_called: "subprocess.run(['git', 'status', '-s'])",
          exit_code: 0,
          stdout: 'Branch: eris-gui-overhaul\nM frontend/src/components/workspace/RightSidebar.tsx',
          duration_ms: 45,
          status: 'success',
        },
      },
    },
    {
      id: 'node-sandbox-verify',
      name: 'Sandbox Environment Diagnostics',
      subtitle: 'Validate Python runtime and Win32 containment boundary',
      icon: 'terminal',
      category: 'cmd',
      status: 'completed',
      config: {
        command: 'python --version',
        minmax_constraints: {
          min_retries: 0,
          max_retries: 2,
          min_timeout_sec: 1,
          max_timeout_sec: 5,
          min_confidence: 0.99,
        },
        execution_output: {
          function_called: "CoreToolbox.run_command('python --version')",
          exit_code: 0,
          stdout: 'Environment: Python 3.14.7 (Windows 11)\nContainment AST: Active\nExit code: 0',
          duration_ms: 62,
          status: 'success',
        },
      },
    },
    {
      id: 'node-minmax-eval',
      name: 'Min-Max Decision Evaluator',
      subtitle: 'Minimizes risk & latency while maximizing verification yield',
      icon: 'minmax',
      category: 'minmax',
      status: 'completed',
      config: {
        minmax_eval: {
          objective: 'balanced_minimax',
          alpha_cost_weight: 0.3,
          beta_risk_weight: 0.7,
          minimax_score: 0.88,
          chosen_branch: 'branch-dirty-audit',
          candidate_branches: [
            {
              id: 'branch-clean-upstream',
              label: 'Clean State: Upstream Web Docs Verification',
              target_node_id: 'node-web-docs',
              cost_weight: 0.2,
              risk_weight: 0.1,
              confidence_score: 0.95,
            },
            {
              id: 'branch-dirty-audit',
              label: 'Modified State: AST Security & Code Review',
              target_node_id: 'node-ai-review',
              cost_weight: 0.4,
              risk_weight: 0.3,
              confidence_score: 0.92,
            },
          ],
        },
      },
    },
    // Left Branch: Clean tree -> Web Docs
    {
      id: 'node-web-docs',
      name: 'Upstream Docs Verification',
      subtitle: 'Verify official documentation & API endpoints',
      icon: 'web',
      category: 'web',
      status: 'completed',
      branchLabel: 'Clean State',
      config: {
        url: 'https://generativelanguage.googleapis.com',
        minmax_constraints: {
          min_retries: 1,
          max_retries: 3,
          min_timeout_sec: 2,
          max_timeout_sec: 10,
          min_confidence: 0.9,
        },
        execution_output: {
          function_called: "urllib.request.urlopen('https://html.duckduckgo.com/html/')",
          exit_code: 0,
          stdout: 'HTTP Status: 200 OK\nLatency: 84ms\nContent-Type: text/html',
          duration_ms: 84,
          status: 'success',
        },
      },
    },
    // Right Branch: Modified tree -> AI Review
    {
      id: 'node-ai-review',
      name: 'AST Security & Code Review',
      subtitle: 'Prompts active LLM to audit unstaged diffs',
      icon: 'ai',
      category: 'ai',
      status: 'completed',
      branchLabel: 'Modified State',
      config: {
        model: 'gemini/gemini-flash-lite-latest',
        promptTemplate: 'Audit git diff for security vulnerabilities, memory leaks, and breaking changes.',
        minmax_constraints: {
          min_retries: 0,
          max_retries: 2,
          min_timeout_sec: 1,
          max_timeout_sec: 15,
          min_confidence: 0.9,
          max_token_budget: 1000,
        },
        execution_output: {
          function_called: 'LiteLLM.acompletion(gemini/gemini-flash-lite-latest)',
          exit_code: 0,
          stdout: 'Audit Result: Clean AST validation. Zero destructive commands detected. Official brand icons loaded.',
          duration_ms: 720,
          status: 'success',
        },
      },
    },
    // Merged Notification Node
    {
      id: 'node-notification',
      name: 'Telemetry Dispatch',
      subtitle: 'Confirm pipeline metrics and dispatch alert',
      icon: 'email',
      category: 'email',
      status: 'completed',
      config: {
        recipientEmail: 'eris.ai.official@gmail.com',
        subject: 'ERIS Autonomous Audit Complete',
        minmax_constraints: {
          min_retries: 0,
          max_retries: 1,
          min_timeout_sec: 1,
          max_timeout_sec: 6,
          min_confidence: 0.99,
        },
        execution_output: {
          function_called: "smtplib.SMTP('smtp.gmail.com', 587)",
          exit_code: 0,
          stdout: 'SMTP 250 OK: Delivery verified via Google App Password gateway.',
          duration_ms: 180,
          status: 'success',
        },
      },
    },
    // End Node
    {
      id: 'node-end',
      name: 'Pipeline Complete',
      subtitle: 'Audit record recorded with Min-Max telemetry',
      icon: 'end',
      category: 'end',
      status: 'completed',
      config: {
        actionDetails: 'Execution log finalized in memory/feedback.json.',
      },
    },
  ],
};

export const STEP_PALETTE_ITEMS: StepPaletteItem[] = [
  // Core System & Terminal
  {
    id: 'step-cmd',
    name: 'Shell Command',
    icon: 'terminal',
    category: 'Core',
    color: '#10b981',
    description: 'Execute sandboxed terminal command with real stdout/stderr capture',
    defaultConfig: {
      command: 'python --version',
      minmax_constraints: { min_retries: 0, max_retries: 2, min_timeout_sec: 1, max_timeout_sec: 10, min_confidence: 0.95 },
    },
  },
  {
    id: 'step-git',
    name: 'Git Inspector',
    icon: 'git',
    category: 'Core',
    color: '#f97316',
    description: 'Query git repository state, diffs, commits, and active branch',
    defaultConfig: {
      gitSubcommand: 'status',
      minmax_constraints: { min_retries: 0, max_retries: 2, min_timeout_sec: 1, max_timeout_sec: 8, min_confidence: 0.95 },
    },
  },
  {
    id: 'step-file',
    name: 'File Operator',
    icon: 'file',
    category: 'Core',
    color: '#3b82f6',
    description: 'Deterministic AST workspace file read and atomic writes',
    defaultConfig: {
      filePath: 'README.md',
      fileMode: 'read',
      minmax_constraints: { min_retries: 0, max_retries: 1, min_timeout_sec: 1, max_timeout_sec: 5, min_confidence: 0.99 },
    },
  },

  // Min-Max & Optimization Logic
  {
    id: 'step-minmax',
    name: 'Min-Max Evaluator',
    icon: 'minmax',
    category: 'Logic',
    color: '#8b5cf6',
    description: 'Algorithmic minimax evaluator that minimizes risk/latency while maximizing yield',
    defaultConfig: {
      minmax_eval: {
        objective: 'balanced_minimax',
        alpha_cost_weight: 0.3,
        beta_risk_weight: 0.7,
        candidate_branches: [],
      },
    },
  },
  {
    id: 'step-condition',
    name: 'Condition',
    icon: 'condition',
    category: 'Logic',
    color: '#f59e0b',
    description: 'Branch execution based on boolean AST expressions',
    defaultConfig: {
      conditionExpression: 'exit_code === 0',
      branchTrue: 'Success',
      branchFalse: 'Failure',
    },
  },

  // AI & Reasoning
  {
    id: 'step-ai-reasoning',
    name: 'AI Reasoning & Triage',
    icon: 'ai',
    category: 'AI & LLM',
    color: '#9333ea',
    description: 'Prompt active LLM model with structured output constraints',
    defaultConfig: {
      model: 'gemini/gemini-flash-lite-latest',
      promptTemplate: 'Analyze input and produce a structured technical summary.',
      minmax_constraints: { min_retries: 0, max_retries: 2, min_timeout_sec: 1, max_timeout_sec: 20, min_confidence: 0.9, max_token_budget: 1200 },
    },
  },

  // Integrations & Web
  {
    id: 'step-web-retriever',
    name: 'Web Retriever',
    icon: 'web',
    category: 'Integrations',
    color: '#06b6d4',
    description: 'Query search engine and scrape readable HTML markdown',
    defaultConfig: {
      url: 'https://html.duckduckgo.com/html/',
      minmax_constraints: { min_retries: 1, max_retries: 3, min_timeout_sec: 2, max_timeout_sec: 12, min_confidence: 0.85 },
    },
  },
  {
    id: 'step-email',
    name: 'Gmail Dispatcher',
    icon: 'gmail',
    category: 'Integrations',
    color: '#ea4335',
    description: 'Dispatch alert emails via configured Google App Password SMTP',
    defaultConfig: {
      recipientEmail: 'your.email@gmail.com',
      subject: 'Pipeline Alert',
      minmax_constraints: { min_retries: 0, max_retries: 2, min_timeout_sec: 1, max_timeout_sec: 8, min_confidence: 0.99 },
    },
  },
];
