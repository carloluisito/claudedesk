import type { Job, RepoConfig, WorkflowConfig, Template } from './job';
import type { Workspace } from './settings';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateJobRequest {
  repoId: string;
  workflowId: string;
  params?: Record<string, string>;
}

export interface CreateJobResponse {
  job: Job;
}

export interface JobLogsResponse {
  step: string;
  content: string;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ArtifactFile {
  path: string;
  type: 'image' | 'log' | 'diff' | 'text' | 'json';
  size: number;
  name: string;
}

export interface ArtifactsListResponse {
  files: ArtifactFile[];
}

export interface ArtifactsResponse {
  diff?: string;
  changedFiles?: string[];
  proofResults?: {
    mode: 'web' | 'api' | 'cli';
    success: boolean;
    screenshot?: string;
    checks?: ProofCheck[];
  };
}

export interface ProofCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
}

// Re-export for convenience
export type { Job, RepoConfig, WorkflowConfig, Template, Workspace };
