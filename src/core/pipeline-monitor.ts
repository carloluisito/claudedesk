/**
 * PipelineMonitorService - CI/CD Pipeline Monitoring
 *
 * Polls GitHub Actions and GitLab CI pipeline runs after a push,
 * broadcasts real-time status via WebSocket, and composes Fix CI
 * prompts on failure.
 *
 * Features:
 * - GitHub Actions and GitLab CI support
 * - Exponential backoff polling (10s → 15s → 22s → 30s cap)
 * - Error categorization from job names and log content
 * - WebSocket broadcasting for real-time UI updates
 * - Fix CI prompt composition with log excerpts
 * - Persistence to config/pipeline-monitors.json
 * - Max 10 concurrent monitors
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { wsManager } from './ws-manager.js';
import { settingsManager } from '../config/settings.js';
import { workspaceManager } from '../config/workspaces.js';
import type { PipelineMonitor, WorkflowRun, WorkflowJob, PipelineErrorCategory } from '../types.js';

// Lazy path resolution
function getMonitorsFile(): string {
  return join(process.cwd(), 'config', 'pipeline-monitors.json');
}

const MAX_CONCURRENT_MONITORS = 10;
const STALL_TIMEOUT_MS = 90000; // 90 seconds before declaring stalled
const BASE_POLL_INTERVAL_MS = 10000;
const MAX_POLL_INTERVAL_MS = 30000;
const BACKOFF_FACTOR = 1.5;

interface StartMonitorOptions {
  sessionId: string;
  platform: 'github' | 'gitlab';
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
  workspaceId?: string;
}

class PipelineMonitorService {
  private monitors: Map<string, PipelineMonitor> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private githubToken: string | null = null;

  constructor() {
    this.loadMonitors();
  }

  // ============================================================
  // Persistence
  // ============================================================

  private loadMonitors(): void {
    const filePath = getMonitorsFile();
    if (!existsSync(filePath)) return;

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as PipelineMonitor[];
      for (const monitor of data) {
        this.monitors.set(monitor.id, monitor);
        // Resume active monitors
        if (monitor.status === 'polling') {
          this.schedulePoll(monitor.id, BASE_POLL_INTERVAL_MS);
        }
      }
      console.log(`[PipelineMonitor] Loaded ${data.length} monitors, resumed ${data.filter(m => m.status === 'polling').length} active`);
    } catch (err) {
      console.warn('[PipelineMonitor] Failed to load monitors:', err);
    }
  }

  private saveMonitors(): void {
    const filePath = getMonitorsFile();
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(this.monitors.values());
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  // ============================================================
  // GitHub Token Resolution
  // ============================================================

  private getGitHubToken(): string | null {
    if (this.githubToken) return this.githubToken;

    // Try environment variable first
    if (process.env.GITHUB_TOKEN) {
      this.githubToken = process.env.GITHUB_TOKEN;
      return this.githubToken;
    }

    // Try gh CLI auth token
    try {
      const { execSync } = require('child_process');
      const token = execSync('gh auth token', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (token) {
        this.githubToken = token;
        return this.githubToken;
      }
    } catch {
      // gh CLI not available or not authenticated
    }

    return null;
  }

  // ============================================================
  // GitLab Token Resolution
  // ============================================================

  private getGitLabToken(workspaceId?: string): string | null {
    // Try GITLAB_TOKEN environment variable first
    if (process.env.GITLAB_TOKEN) {
      return process.env.GITLAB_TOKEN;
    }

    // Try workspace-specific encrypted token
    if (workspaceId) {
      const tokenData = workspaceManager.getGitLabToken(workspaceId);
      if (tokenData?.accessToken) {
        return tokenData.accessToken;
      }
    }

    // Try glab CLI auth token
    try {
      const { execSync } = require('child_process');
      const token = execSync('glab auth token', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (token) return token;
    } catch {
      // glab CLI not available or not authenticated
    }

    return null;
  }

  // ============================================================
  // GitHub API
  // ============================================================

  private async fetchWorkflowRuns(owner: string, repo: string, branch: string): Promise<WorkflowRun[]> {
    const token = this.getGitHubToken();
    if (!token) throw new Error('No GitHub token available');

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ClaudeDesk-PipelineMonitor',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`GitHub auth error: ${response.status}`);
      }
      if (response.status === 404) {
        return []; // No Actions configured
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.workflow_runs || []).map((run: Record<string, unknown>) => ({
      id: run.id as number,
      name: run.name as string,
      status: run.status as string,
      conclusion: run.conclusion as string | null,
      headBranch: run.head_branch as string,
      headSha: run.head_sha as string,
      htmlUrl: run.html_url as string,
      jobs: [],
    }));
  }

  private async fetchJobsForRun(owner: string, repo: string, runId: number): Promise<WorkflowJob[]> {
    const token = this.getGitHubToken();
    if (!token) throw new Error('No GitHub token available');

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ClaudeDesk-PipelineMonitor',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.jobs || []).map((job: Record<string, unknown>) => ({
      id: job.id as number,
      name: job.name as string,
      status: job.status as string,
      conclusion: job.conclusion as string | null,
      steps: ((job.steps || []) as Record<string, unknown>[]).map((step) => ({
        name: step.name as string,
        status: step.status as string,
        conclusion: step.conclusion as string | null,
        number: step.number as number,
      })),
    }));
  }

  private async fetchGitHubJobLogs(owner: string, repo: string, jobId: number): Promise<string> {
    const token = this.getGitHubToken();
    if (!token) throw new Error('No GitHub token available');

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ClaudeDesk-PipelineMonitor',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }

    return response.text();
  }

  // ============================================================
  // GitLab CI API
  // ============================================================

  /**
   * Fetch pipelines for a GitLab project.
   * owner/repo is the project path (e.g. "group/subgroup/repo")
   * which gets URL-encoded for the API call.
   */
  private async fetchGitLabPipelines(
    projectPath: string, branch: string, commitSha: string, token: string
  ): Promise<WorkflowRun[]> {
    const encoded = encodeURIComponent(projectPath);
    // Fetch pipelines for the branch, filter by SHA client-side
    const url = `https://gitlab.com/api/v4/projects/${encoded}/pipelines?ref=${encodeURIComponent(branch)}&per_page=10`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'ClaudeDesk-PipelineMonitor',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`GitLab auth error: ${response.status}`);
      }
      if (response.status === 404) {
        return [];
      }
      throw new Error(`GitLab API error: ${response.status}`);
    }

    const pipelines = await response.json() as Record<string, unknown>[];
    return pipelines.map((p) => ({
      id: p.id as number,
      name: (p.source as string) || 'Pipeline',
      status: this.mapGitLabStatus(p.status as string),
      conclusion: this.mapGitLabConclusion(p.status as string),
      headBranch: p.ref as string,
      headSha: p.sha as string,
      htmlUrl: p.web_url as string,
      jobs: [],
    }));
  }

  /**
   * Fetch jobs for a GitLab pipeline.
   */
  private async fetchGitLabJobs(
    projectPath: string, pipelineId: number, token: string
  ): Promise<WorkflowJob[]> {
    const encoded = encodeURIComponent(projectPath);
    const url = `https://gitlab.com/api/v4/projects/${encoded}/pipelines/${pipelineId}/jobs?per_page=100`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'ClaudeDesk-PipelineMonitor',
      },
    });

    if (!response.ok) return [];

    const jobs = await response.json() as Record<string, unknown>[];
    return jobs.map((job) => ({
      id: job.id as number,
      name: job.name as string,
      status: this.mapGitLabStatus(job.status as string),
      conclusion: this.mapGitLabConclusion(job.status as string),
      steps: job.stage ? [{
        name: job.stage as string,
        status: this.mapGitLabStatus(job.status as string),
        conclusion: this.mapGitLabConclusion(job.status as string),
        number: 1,
      }] : [],
    }));
  }

  /**
   * Fetch the trace (log output) for a GitLab job.
   */
  private async fetchGitLabJobTrace(
    projectPath: string, jobId: number, token: string
  ): Promise<string> {
    const encoded = encodeURIComponent(projectPath);
    const url = `https://gitlab.com/api/v4/projects/${encoded}/jobs/${jobId}/trace`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'ClaudeDesk-PipelineMonitor',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitLab job trace: ${response.status}`);
    }

    return response.text();
  }

  /**
   * Map GitLab pipeline/job status to the GitHub-compatible status used internally.
   * GitLab statuses: created, waiting_for_resource, preparing, pending, running,
   *   success, failed, canceled, skipped, manual, scheduled
   */
  private mapGitLabStatus(status: string): string {
    switch (status) {
      case 'success':
      case 'failed':
      case 'canceled':
      case 'skipped':
        return 'completed';
      case 'running':
        return 'in_progress';
      case 'created':
      case 'waiting_for_resource':
      case 'preparing':
      case 'pending':
      case 'manual':
      case 'scheduled':
        return 'queued';
      default:
        return status;
    }
  }

  /**
   * Map GitLab status to a conclusion value.
   * Only meaningful for terminal statuses.
   */
  private mapGitLabConclusion(status: string): string | null {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'failure';
      case 'canceled':
        return 'cancelled';
      case 'skipped':
        return 'skipped';
      default:
        return null;
    }
  }

  // ============================================================
  // Platform-Agnostic Fetch Helpers
  // ============================================================

  private async fetchRuns(monitor: PipelineMonitor): Promise<WorkflowRun[]> {
    if (monitor.platform === 'gitlab') {
      const token = this.getGitLabToken(monitor.workspaceId);
      if (!token) throw new Error('No GitLab token available');
      const projectPath = `${monitor.owner}/${monitor.repo}`;
      return this.fetchGitLabPipelines(projectPath, monitor.branch, monitor.commitSha, token);
    }
    return this.fetchWorkflowRuns(monitor.owner, monitor.repo, monitor.branch);
  }

  private async fetchJobs(monitor: PipelineMonitor, runId: number): Promise<WorkflowJob[]> {
    if (monitor.platform === 'gitlab') {
      const token = this.getGitLabToken(monitor.workspaceId);
      if (!token) return [];
      const projectPath = `${monitor.owner}/${monitor.repo}`;
      return this.fetchGitLabJobs(projectPath, runId, token);
    }
    return this.fetchJobsForRun(monitor.owner, monitor.repo, runId);
  }

  // ============================================================
  // Public: Fetch Job Logs
  // ============================================================

  async fetchJobLogs(monitorId: string, jobId: number): Promise<string> {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) throw new Error('Monitor not found');

    let text: string;
    if (monitor.platform === 'gitlab') {
      const token = this.getGitLabToken(monitor.workspaceId);
      if (!token) throw new Error('No GitLab token available');
      const projectPath = `${monitor.owner}/${monitor.repo}`;
      text = await this.fetchGitLabJobTrace(projectPath, jobId, token);
    } else {
      text = await this.fetchGitHubJobLogs(monitor.owner, monitor.repo, jobId);
    }

    // Limit to last 2000 lines
    const lines = text.split('\n');
    if (lines.length > 2000) {
      return lines.slice(-2000).join('\n');
    }
    return text;
  }

  // ============================================================
  // Polling Engine
  // ============================================================

  private getBackoffInterval(pollCount: number): number {
    const cicd = settingsManager.getCicd();
    const baseInterval = cicd.pollIntervalMs || BASE_POLL_INTERVAL_MS;
    const interval = Math.min(
      baseInterval * Math.pow(BACKOFF_FACTOR, Math.min(pollCount, 4)),
      MAX_POLL_INTERVAL_MS
    );
    return Math.round(interval);
  }

  private schedulePoll(monitorId: string, delayMs: number): void {
    // Clear any existing timer
    const existing = this.timers.get(monitorId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => this.poll(monitorId), delayMs);
    this.timers.set(monitorId, timer);
  }

  private async poll(monitorId: string): Promise<void> {
    const monitor = this.monitors.get(monitorId);
    if (!monitor || monitor.status !== 'polling') return;

    const cicd = settingsManager.getCicd();
    const now = new Date().toISOString();

    // Check max duration
    const elapsed = Date.now() - new Date(monitor.timestamps.startedAt).getTime();
    if (elapsed > (cicd.maxPollDurationMs || 1800000)) {
      monitor.status = 'stalled';
      monitor.timestamps.completedAt = now;
      this.saveMonitors();
      this.broadcast(monitor.sessionId, 'pipeline:stalled', { monitor });
      return;
    }

    try {
      // Fetch runs using platform-agnostic helper
      const runs = await this.fetchRuns(monitor);

      // Filter runs matching our exact commit SHA.
      // During the first 30s, also accept branch matches as a grace period
      // (CI systems may take a moment to register the run against the SHA).
      const timeSinceStart = Date.now() - new Date(monitor.timestamps.startedAt).getTime();
      const inGracePeriod = timeSinceStart < 30000;
      const shaMatches = runs.filter((r) => r.headSha === monitor.commitSha);
      const relevantRuns = shaMatches.length > 0
        ? shaMatches
        : inGracePeriod
          ? runs.filter((r) => r.headBranch === monitor.branch)
          : [];

      // Check stall: no runs found after timeout
      if (relevantRuns.length === 0) {
        if (timeSinceStart > STALL_TIMEOUT_MS) {
          monitor.status = 'stalled';
          monitor.timestamps.completedAt = now;
          this.saveMonitors();
          this.broadcast(monitor.sessionId, 'pipeline:stalled', { monitor });
          return;
        }
      }

      // Fetch jobs for each run
      for (const run of relevantRuns) {
        if (run.status !== 'completed') {
          run.jobs = await this.fetchJobs(monitor, run.id);
        } else if (run.conclusion === 'failure') {
          run.jobs = await this.fetchJobs(monitor, run.id);
        }
      }

      // Update monitor
      monitor.runs = relevantRuns;
      monitor.pollCount++;
      monitor.timestamps.lastPollAt = now;

      // Check if all runs are complete
      const allComplete = relevantRuns.length > 0 && relevantRuns.every((r) => r.status === 'completed');

      if (allComplete) {
        const anyFailed = relevantRuns.some((r) => r.conclusion === 'failure');

        if (anyFailed) {
          monitor.status = 'failed';
          // Categorize error
          const failedRun = relevantRuns.find((r) => r.conclusion === 'failure');
          if (failedRun) {
            const failedJob = failedRun.jobs.find((j) => j.conclusion === 'failure');
            if (failedJob) {
              monitor.failedJobId = failedJob.id;
              monitor.errorCategory = this.categorizeError(failedJob);
              monitor.errorSummary = this.summarizeError(failedJob);
            }
          }
        } else {
          monitor.status = 'success';
        }

        monitor.timestamps.completedAt = now;
        this.saveMonitors();
        this.broadcast(monitor.sessionId, 'pipeline:complete', { monitor });
        return;
      }

      // Continue polling
      this.saveMonitors();
      this.broadcast(monitor.sessionId, 'pipeline:status', { monitor });
      this.schedulePoll(monitorId, this.getBackoffInterval(monitor.pollCount));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[PipelineMonitor] Poll error for ${monitorId}:`, errorMsg);

      // On auth/network errors, stop polling
      if (errorMsg.includes('auth error') || errorMsg.includes('rate limit')) {
        monitor.status = 'error';
        monitor.errorSummary = errorMsg;
        monitor.timestamps.completedAt = now;
        this.saveMonitors();
        this.broadcast(monitor.sessionId, 'pipeline:error', { monitor, error: errorMsg });
        return;
      }

      // Transient error, retry with backoff
      monitor.pollCount++;
      this.schedulePoll(monitorId, this.getBackoffInterval(monitor.pollCount));
    }
  }

  // ============================================================
  // Error Categorization
  // ============================================================

  private categorizeError(job: WorkflowJob): PipelineErrorCategory {
    const name = job.name.toLowerCase();
    const failedStep = job.steps.find((s) => s.conclusion === 'failure');
    const stepName = failedStep?.name.toLowerCase() || '';

    if (name.includes('test') || stepName.includes('test') || stepName.includes('jest') || stepName.includes('vitest') || stepName.includes('pytest') || stepName.includes('rspec')) {
      return 'test_failure';
    }
    if (name.includes('build') || name.includes('compile') || stepName.includes('build') || stepName.includes('compile')) {
      return 'build_error';
    }
    if (name.includes('lint') || stepName.includes('lint') || stepName.includes('eslint') || stepName.includes('prettier') || stepName.includes('rubocop')) {
      return 'lint_error';
    }
    if (name.includes('type') || name.includes('tsc') || stepName.includes('type-check') || stepName.includes('tsc') || stepName.includes('mypy')) {
      return 'type_error';
    }
    if (job.conclusion === 'timed_out' || stepName.includes('timeout')) {
      return 'timeout';
    }
    return 'unknown';
  }

  private summarizeError(job: WorkflowJob): string {
    const failedStep = job.steps.find((s) => s.conclusion === 'failure');
    if (failedStep) {
      return `Job "${job.name}" failed at step "${failedStep.name}"`;
    }
    return `Job "${job.name}" failed`;
  }

  // ============================================================
  // Fix CI Prompt Composition
  // ============================================================

  composeFixCIPrompt(monitor: PipelineMonitor, logs?: string): string {
    const parts: string[] = [];
    const platformLabel = monitor.platform === 'gitlab' ? 'GitLab CI' : 'GitHub Actions';

    parts.push(`## Fix CI Failure`);
    parts.push(``);
    parts.push(`**Platform:** ${platformLabel}`);
    parts.push(`**Repository:** ${monitor.owner}/${monitor.repo}`);
    parts.push(`**Branch:** ${monitor.branch}`);
    parts.push(`**Commit:** ${monitor.commitSha.substring(0, 7)}`);

    if (monitor.errorCategory) {
      parts.push(`**Error Category:** ${monitor.errorCategory.replace(/_/g, ' ')}`);
    }

    if (monitor.errorSummary) {
      parts.push(`**Error:** ${monitor.errorSummary}`);
    }

    // List failed jobs/steps
    const failedRun = monitor.runs.find((r) => r.conclusion === 'failure');
    if (failedRun) {
      parts.push(``);
      parts.push(`### Failed ${monitor.platform === 'gitlab' ? 'Pipeline' : 'Workflow'}: ${failedRun.name}`);
      const failedJobs = failedRun.jobs.filter((j) => j.conclusion === 'failure');
      for (const job of failedJobs) {
        parts.push(`- **${job.name}**`);
        const failedSteps = job.steps.filter((s) => s.conclusion === 'failure');
        for (const step of failedSteps) {
          parts.push(`  - Step ${step.number}: ${step.name} (FAILED)`);
        }
      }
    }

    if (logs) {
      // Last 200 lines of logs
      const logLines = logs.split('\n');
      const excerpt = logLines.slice(-200).join('\n');
      parts.push(``);
      parts.push(`### CI Logs (last 200 lines)`);
      parts.push('```');
      parts.push(excerpt);
      parts.push('```');
    }

    parts.push(``);
    parts.push(`Please diagnose and fix the CI failure. Look at the error output above, identify the root cause, and make the minimum changes needed to pass CI.`);

    return parts.join('\n');
  }

  // ============================================================
  // WebSocket Broadcasting
  // ============================================================

  private broadcast(sessionId: string, type: string, data: Record<string, unknown>): void {
    try {
      wsManager.broadcastToSession(sessionId, {
        type,
        sessionId,
        ...data,
      });
    } catch (err) {
      console.error(`[PipelineMonitor] Broadcast error:`, err);
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  startMonitor(options: StartMonitorOptions): PipelineMonitor {
    // Enforce max concurrent
    const activeCount = Array.from(this.monitors.values()).filter((m) => m.status === 'polling').length;
    if (activeCount >= MAX_CONCURRENT_MONITORS) {
      throw new Error(`Maximum concurrent monitors (${MAX_CONCURRENT_MONITORS}) reached`);
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const monitor: PipelineMonitor = {
      id,
      sessionId: options.sessionId,
      platform: options.platform,
      owner: options.owner,
      repo: options.repo,
      branch: options.branch,
      commitSha: options.commitSha,
      workspaceId: options.workspaceId,
      status: 'polling',
      runs: [],
      timestamps: {
        startedAt: now,
      },
      pollCount: 0,
    };

    this.monitors.set(id, monitor);
    this.saveMonitors();

    // Start polling
    this.schedulePoll(id, BASE_POLL_INTERVAL_MS);

    const platformLabel = options.platform === 'gitlab' ? 'GitLab' : 'GitHub';
    console.log(`[PipelineMonitor] Started ${platformLabel} monitor ${id} for ${options.owner}/${options.repo}@${options.branch}`);
    return monitor;
  }

  stopMonitor(monitorId: string): void {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) return;

    // Clear timer
    const timer = this.timers.get(monitorId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(monitorId);
    }

    monitor.status = 'stopped';
    monitor.timestamps.completedAt = new Date().toISOString();
    this.saveMonitors();
  }

  getMonitor(monitorId: string): PipelineMonitor | undefined {
    return this.monitors.get(monitorId);
  }

  getMonitorBySessionId(sessionId: string): PipelineMonitor | undefined {
    return Array.from(this.monitors.values()).find(
      (m) => m.sessionId === sessionId && (m.status === 'polling' || m.status === 'success' || m.status === 'failed')
    );
  }
}

// Lazy singleton with proxy pattern (same as SettingsManager)
let _pipelineMonitorService: PipelineMonitorService | null = null;

function getPipelineMonitorServiceInstance(): PipelineMonitorService {
  if (!_pipelineMonitorService) {
    _pipelineMonitorService = new PipelineMonitorService();
  }
  return _pipelineMonitorService;
}

export const pipelineMonitorService = new Proxy({} as PipelineMonitorService, {
  get(_, prop) {
    const instance = getPipelineMonitorServiceInstance();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(instance) : value;
  },
});
