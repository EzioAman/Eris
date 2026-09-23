

export type ToolKind = 'output' | 'approval' | 'flow';

export interface ToolOutputItem {
  kind: 'output';
  id: string;
  name: string;
  output: string;
  duration: string;
}

export interface ToolApprovalItem {
  kind: 'approval';
  id: string;
  decision: 'pending' | 'approved' | 'denied';
  tool?: string;
  action?: string;
  consequence?: string;
  input?: string;
  command?: string;
  result?: string;
  targetApi?: string;
  riskLevel?: 'high' | 'critical' | 'moderate';
}

export interface ToolFlowItem {
  kind: 'flow';
  id: string;
  task: ScheduledTaskItem;
}

export type ChatTool = ToolOutputItem | ToolApprovalItem | ToolFlowItem;

export interface SearchStepItem {
  query: string;
  status?: 'searching' | 'done';
  results?: { title: string; domain: string; url?: string }[];
}

export interface SourceItem {
  domain: string;
  url: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning?: string;
  reasoningSteps?: { turn: number; thought?: string; actions?: string[]; observations?: string[] }[];
  searches?: SearchStepItem[];
  sources?: SourceItem[];
  tools?: ChatTool[];
  templateType?: string;
  templateData?: any;
  switches?: string[];
  thoughtDuration?: number;
  activeModel?: string;
  timestamp?: string;
}

export interface ActiveThinkingState {
  startTime: number;
  elapsedSeconds: number;
  activeModel?: string;
  switches: string[];
  currentAction?: string;
  actions: string[];
  thoughts: string[];
  reasoning?: string;
  searches?: SearchStepItem[];
  turn: number;
}

export interface ConnectorItem {
  id: string;
  name: string;
  icon: string;
  status: 'on' | 'off';
  description?: string;
  category?: 'productivity' | 'communication' | 'storage' | 'dev';
}

export interface FlowNode {
  id: string;
  name: string;
  detail: string;
  status: 'completed' | 'active' | 'pending' | 'failed';
  parallel?: boolean;
  parallelGroup?: string;
  tool?: string;
  mcpServer?: string;
}

export interface ScheduledTaskItem {
  id: string;
  title: string;
  schedule: string;
  summary: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  apps: string[];
  steps: FlowNode[];
  history: { id: string; action: string; timeAgo: string; status: 'success' | 'failed' | 'created' }[];
  createdBy?: 'eris' | 'user' | 'system';
  executionMode?: 'speed' | 'accuracy';
  autoApprove?: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  instructions: string;
  tool: 'READ_FILE' | 'WRITE_FILE' | 'LIST_DIR' | 'RUN_COMMAND' | 'CALL_TOOL' | 'auto';
  toolArg?: string;
  mcpServer?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  result?: string;
}

export interface Workflow {
  id: string;
  name: string;
  goal: string;
  steps: WorkflowStep[];
  executionMode: 'speed' | 'accuracy';
  autoApprove: boolean;
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdBy: 'user' | 'eris';
  createdAt: string;
}
