export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  repository_url: string;
  branch: string;
  is_indexed: boolean;
  index_status: string;
  last_indexed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  repository_url: string;
  branch?: string;
}

export interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
}

export interface SearchResult {
  score: number;
  payload: Record<string, unknown>;
}

export interface TerminalResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

// ---- WebSocket agent events ----

export type AgentNode = 'retriever' | 'planner' | 'coder' | 'reviewer' | 'reflection';

export interface CodeChange {
  tool: string;
  file_path: string;
  content: string;
  command: string;
  result: unknown;
  error: string | null;
}

export interface NodeState {
  status: string;
  plan: string;
  plan_steps: string[];
  code_changes: CodeChange[];
  review_status: string;
  reflection_action: string;
  errors: string[];
  /** Live safeguard counters forwarded from the backend on every node_update */
  iteration_count: number;
  retry_count: number;
}

export interface WorkflowMetrics {
  iteration_count: number;
  retry_count: number;
  execution_time: number;
  termination_reason: string;
}

export type AgentEvent =
  | { event: 'workflow_started'; session_id: string }
  | { event: 'node_update'; node: string; state: NodeState }
  | { event: 'message_update'; node: string; content: string; type: string }
  | { event: 'workflow_completed'; session_id: string; metrics: WorkflowMetrics }
  | { event: 'workflow_terminated'; session_id: string; reason: string; detail: string; metrics: WorkflowMetrics }
  | { event: 'error'; message: string };
