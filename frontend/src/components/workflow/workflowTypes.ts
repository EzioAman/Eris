export type NodeCategory =
  | 'trigger'
  | 'cmd'
  | 'git'
  | 'file'
  | 'web'
  | 'ai'
  | 'minmax'
  | 'email'
  | 'condition'
  | 'action'
  | 'end';

export type NodeStatus = 'completed' | 'active' | 'pending' | 'failed';

export interface NodeOutputItem {
  key: string;
  type: 'text' | 'array' | 'url' | 'json';
  label: string;
}

export interface NodeFilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface MinMaxConstraints {
  min_retries: number;
  max_retries: number;
  min_timeout_sec: number;
  max_timeout_sec: number;
  min_confidence: number;
  max_token_budget?: number;
}

export interface MinMaxBranchCandidate {
  id: string;
  label: string;
  target_node_id: string;
  cost_weight: number;
  risk_weight: number;
  confidence_score?: number;
}

export interface MinMaxEvaluationConfig {
  objective: 'min_latency' | 'min_risk' | 'max_accuracy' | 'balanced_minimax';
  alpha_cost_weight: number;
  beta_risk_weight: number;
  candidate_branches: MinMaxBranchCandidate[];
  chosen_branch?: string;
  minimax_score?: number;
}

export interface ExecutionResultPayload {
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  duration_ms?: number;
  timestamp?: string;
  status?: 'success' | 'failed';
  function_called?: string;
}

export interface NodeConfig {
  // Command & Terminal
  command?: string;

  // Git Inspector
  gitSubcommand?: 'status' | 'diff' | 'log' | 'branch' | 'show';

  // File Operations
  filePath?: string;
  fileContent?: string;
  fileMode?: 'read' | 'write' | 'append';
  fileOperation?: 'read' | 'write' | 'append';

  // Web Scraping & Search
  url?: string;
  searchQuery?: string;
  queryUrl?: string;

  // AI & Reasoning
  promptTemplate?: string;
  model?: string;

  // Email / Notifications
  recipientEmail?: string;
  subject?: string;
  emailBody?: string;

  // Conditional logic
  conditionExpression?: string;
  branchTrue?: string;
  branchFalse?: string;

  // Min-Max Execution & Branching Engine
  minmax_constraints?: MinMaxConstraints;
  minmax_eval?: MinMaxEvaluationConfig;

  // Real Captured Execution Output
  execution_output?: ExecutionResultPayload;

  // Compatibility fields
  triggerEvent?: string;
  repository?: string;
  filters?: NodeFilterRule[];
  outputs?: NodeOutputItem[];
  channel?: string;
  projectKey?: string;
  issueType?: string;
  actionDetails?: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  subtitle: string;
  icon: string; // 'git' | 'terminal' | 'file' | 'web' | 'ai' | 'minmax' | 'gmail' | 'condition' | 'end'
  category: NodeCategory;
  status: NodeStatus;
  branchLabel?: string;
  config: NodeConfig;
  x?: number;
  y?: number;
}

export interface StepPaletteItem {
  id: string;
  name: string;
  icon: string;
  category: 'AI & LLM' | 'Integrations' | 'Logic' | 'Core';
  color: string;
  description: string;
  defaultConfig?: NodeConfig;
}

export interface WorkflowPipeline {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'draft' | 'paused';
  lastSaved: string;
  nodes: WorkflowNode[];
  minmax_optimization_score?: number;
}

export interface WorkflowRunRecord {
  id: string;
  runAt: string;
  duration: string;
  trigger: string;
  status: 'success' | 'failed' | 'running';
  stepsCompleted: number;
  totalSteps: number;
  minmax_chosen_path?: string;
}
