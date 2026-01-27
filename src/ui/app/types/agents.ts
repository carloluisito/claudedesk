/**
 * Agent Types - Types for the Agents Access and Configuration feature
 */

export interface AgentInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  required: boolean;
  default?: string | number | boolean;
  options?: string[];
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model: 'opus' | 'sonnet' | 'haiku' | 'inherit';
  color?: string;
  source: 'user' | 'builtin';
  isPinned?: boolean;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  progress?: number;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentInputValues {
  [key: string]: string | number | boolean;
}

export interface PinnedAgentsSettings {
  pinnedAgentIds: string[];
}

export interface AgentUsage {
  agentId: string;
  lastUsedAt: string;
  useCount: number;
}
