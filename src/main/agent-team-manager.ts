import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { IPCEmitter } from './ipc-emitter';
import type {
  TeamConfig,
  Task,
  TeamInfo,
  SessionMetadata,
} from '../shared/ipc-types';

const CLAUDE_DIR = path.join(app.getPath('home'), '.claude');
const TEAMS_DIR = path.join(CLAUDE_DIR, 'teams');
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks');

const DEBOUNCE_MS = 200;
const WATCHER_RETRY_COUNT = 3;
const WATCHER_RETRY_DELAY_MS = 2000;
const AUTO_LINK_WINDOW_MS = 30000; // 30 seconds

export class AgentTeamManager {
  private teams: Map<string, TeamInfo> = new Map();
  private sessionTeamMap: Map<string, string> = new Map(); // sessionId → teamName
  private teamsWatcher: fs.FSWatcher | null = null;
  private tasksWatcher: fs.FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private emitter: IPCEmitter | null = null;
  private getSessionsFn: (() => SessionMetadata[]) | null = null;
  private updateSessionMetadataFn: ((sessionId: string, teamData: Partial<SessionMetadata>) => void) | null = null;
  private closeSessionFn: ((sessionId: string) => Promise<boolean>) | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.emitter = new IPCEmitter(window);
  }

  setSessionAccessors(
    getSessions: () => SessionMetadata[],
    updateMetadata: (sessionId: string, teamData: Partial<SessionMetadata>) => void,
    closeSession: (sessionId: string) => Promise<boolean>,
  ): void {
    this.getSessionsFn = getSessions;
    this.updateSessionMetadataFn = updateMetadata;
    this.closeSessionFn = closeSession;
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    this.ensureDir(TEAMS_DIR);
    this.ensureDir(TASKS_DIR);

    // Scan existing files
    await this.scanTeams();
    await this.scanTasks();

    // Start watchers
    this.startTeamsWatcher();
    this.startTasksWatcher();
  }

  destroy(): void {
    if (this.teamsWatcher) {
      this.teamsWatcher.close();
      this.teamsWatcher = null;
    }
    if (this.tasksWatcher) {
      this.tasksWatcher.close();
      this.tasksWatcher = null;
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.teams.clear();
    this.sessionTeamMap.clear();
  }

  // ── Public API ──

  getTeams(): TeamInfo[] {
    return Array.from(this.teams.values());
  }

  getTeamForSession(sessionId: string): TeamInfo | null {
    const teamName = this.sessionTeamMap.get(sessionId);
    if (!teamName) return null;
    return this.teams.get(teamName) || null;
  }

  getTeamSessions(teamName: string): SessionMetadata[] {
    if (!this.getSessionsFn) return [];
    const sessions = this.getSessionsFn();
    return sessions.filter(s => s.teamName === teamName);
  }

  linkSessionToTeam(sessionId: string, teamName: string, agentId: string): boolean {
    const team = this.teams.get(teamName);
    if (!team) return false;

    const member = team.members.find(m => m.agentId === agentId);
    if (!member) return false;

    this.sessionTeamMap.set(sessionId, teamName);

    if (this.updateSessionMetadataFn) {
      this.updateSessionMetadataFn(sessionId, {
        teamName,
        agentId,
        agentType: member.agentType,
        isTeammate: member.agentType === 'teammate',
      });
    }

    return true;
  }

  unlinkSessionFromTeam(sessionId: string): boolean {
    const hadTeam = this.sessionTeamMap.has(sessionId);
    this.sessionTeamMap.delete(sessionId);

    if (this.updateSessionMetadataFn) {
      this.updateSessionMetadataFn(sessionId, {
        teamName: undefined,
        agentId: undefined,
        agentType: undefined,
        isTeammate: undefined,
      });
    }

    return hadTeam;
  }

  async closeTeam(teamName: string): Promise<boolean> {
    const team = this.teams.get(teamName);
    if (!team || !this.closeSessionFn || !this.getSessionsFn) return false;

    const sessions = this.getSessionsFn().filter(s => s.teamName === teamName);
    for (const session of sessions) {
      await this.closeSessionFn(session.id);
      this.sessionTeamMap.delete(session.id);
    }

    return true;
  }

  // ── Auto-linking ──

  autoLinkSessions(teamName: string): void {
    if (!this.getSessionsFn || !this.updateSessionMetadataFn) return;

    const team = this.teams.get(teamName);
    if (!team) return;

    const now = Date.now();
    const sessions = this.getSessionsFn();

    // Find sessions created recently that haven't been linked
    const recentUnlinked = sessions
      .filter(s => !s.teamName && (now - s.createdAt) < AUTO_LINK_WINDOW_MS)
      .sort((a, b) => a.createdAt - b.createdAt); // oldest first

    if (recentUnlinked.length === 0) return;

    // Find the lead member
    const leadMember = team.members.find(m => m.agentType === 'lead');
    if (!leadMember) return;

    // Link the oldest recent session as lead
    const leadSession = recentUnlinked.find(s => s.status === 'running') || recentUnlinked[0];
    if (leadSession) {
      this.linkSessionToTeam(leadSession.id, teamName, leadMember.agentId);
      team.leadSessionId = leadSession.id;
    }
  }

  // ── Directory & File Helpers ──

  private ensureDir(dir: string): void {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error(`Failed to create directory ${dir}:`, err);
    }
  }

  private async scanTeams(): Promise<void> {
    try {
      const files = fs.readdirSync(TEAMS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          this.loadTeamFile(file);
        }
      }
    } catch (err) {
      console.error('Failed to scan teams directory:', err);
    }
  }

  private async scanTasks(): Promise<void> {
    try {
      const files = fs.readdirSync(TASKS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          this.loadTaskFile(file);
        }
      }
    } catch (err) {
      console.error('Failed to scan tasks directory:', err);
    }
  }

  private loadTeamFile(filename: string): void {
    try {
      const filePath = path.join(TEAMS_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as TeamConfig;

      if (!config.members || !Array.isArray(config.members)) return;

      const teamName = path.basename(filename, '.json');
      const existing = this.teams.get(teamName);

      const team: TeamInfo = {
        name: teamName,
        leadSessionId: existing?.leadSessionId,
        members: config.members.map(m => ({
          name: m.name || m.agentId,
          agentId: m.agentId,
          agentType: m.agentType || 'teammate',
        })),
        tasks: existing?.tasks || [],
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      const isNew = !existing;
      this.teams.set(teamName, team);

      if (isNew) {
        this.emitter?.emit('onTeamDetected', team);
        // Try auto-linking
        this.autoLinkSessions(teamName);
      }

      // Check for new teammates
      if (existing) {
        const existingIds = new Set(existing.members.map(m => m.agentId));
        for (const member of team.members) {
          if (!existingIds.has(member.agentId)) {
            this.emitter?.emit('onTeammateAdded', {
              teamName,
              member,
            });
          }
        }
      }
    } catch (err) {
      // Skip malformed files silently
      console.warn(`Failed to parse team file ${filename}:`, err);
    }
  }

  private loadTaskFile(filename: string): void {
    try {
      const filePath = path.join(TASKS_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Tasks can be structured in different ways
      // Try to extract tasks from the file
      let tasks: Task[] = [];

      if (Array.isArray(data)) {
        tasks = data.map(this.normalizeTask).filter(Boolean) as Task[];
      } else if (data.tasks && Array.isArray(data.tasks)) {
        tasks = data.tasks.map(this.normalizeTask).filter(Boolean) as Task[];
      } else if (data.taskId || data.subject) {
        const task = this.normalizeTask(data);
        if (task) tasks = [task];
      }

      if (tasks.length === 0) return;

      // Determine which team this task file belongs to
      // Try to match by filename or owner
      const taskTeamName = path.basename(filename, '.json');

      // Update tasks for matching team or create a virtual team
      let team = this.teams.get(taskTeamName);
      if (!team) {
        // Try to find team by checking task owners
        for (const [, t] of this.teams) {
          const memberIds = new Set(t.members.map(m => m.agentId));
          if (tasks.some(task => task.owner && memberIds.has(task.owner))) {
            team = t;
            break;
          }
        }
      }

      if (team) {
        team.tasks = tasks;
        team.updatedAt = Date.now();
        this.emitter?.emit('onTasksUpdated', { teamName: team.name, tasks });
      }
    } catch (err) {
      console.warn(`Failed to parse task file ${filename}:`, err);
    }
  }

  private normalizeTask(data: any): Task | null {
    if (!data || typeof data !== 'object') return null;
    if (!data.taskId && !data.id && !data.subject) return null;

    return {
      taskId: String(data.taskId || data.id || `task-${Date.now()}`),
      subject: String(data.subject || data.title || 'Untitled'),
      description: String(data.description || ''),
      status: this.normalizeTaskStatus(data.status),
      owner: data.owner ? String(data.owner) : undefined,
      blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy.map(String) : undefined,
      blocks: Array.isArray(data.blocks) ? data.blocks.map(String) : undefined,
    };
  }

  private normalizeTaskStatus(status: any): 'pending' | 'in_progress' | 'completed' {
    const s = String(status || '').toLowerCase();
    if (s === 'in_progress' || s === 'in-progress' || s === 'active' || s === 'running') return 'in_progress';
    if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
    return 'pending';
  }

  // ── File Watchers ──

  private startTeamsWatcher(retryCount = 0): void {
    try {
      this.teamsWatcher = fs.watch(TEAMS_DIR, (_eventType, filename) => {
        if (!filename || !filename.endsWith('.json')) return;
        this.debounce(`team:${filename}`, () => {
          const filePath = path.join(TEAMS_DIR, filename);
          if (fs.existsSync(filePath)) {
            this.loadTeamFile(filename);
          } else {
            // Team file removed
            const teamName = path.basename(filename, '.json');
            this.teams.delete(teamName);
            this.emitter?.emit('onTeamRemoved', { teamName });
          }
        });
      });

      this.teamsWatcher.on('error', (err) => {
        console.error('Teams watcher error:', err);
        this.teamsWatcher?.close();
        this.teamsWatcher = null;
        if (retryCount < WATCHER_RETRY_COUNT) {
          setTimeout(() => this.startTeamsWatcher(retryCount + 1), WATCHER_RETRY_DELAY_MS);
        }
      });
    } catch (err) {
      console.error('Failed to start teams watcher:', err);
      if (retryCount < WATCHER_RETRY_COUNT) {
        setTimeout(() => this.startTeamsWatcher(retryCount + 1), WATCHER_RETRY_DELAY_MS);
      }
    }
  }

  private startTasksWatcher(retryCount = 0): void {
    try {
      this.tasksWatcher = fs.watch(TASKS_DIR, (_eventType, filename) => {
        if (!filename || !filename.endsWith('.json')) return;
        this.debounce(`task:${filename}`, () => {
          const filePath = path.join(TASKS_DIR, filename);
          if (fs.existsSync(filePath)) {
            this.loadTaskFile(filename);
          }
        });
      });

      this.tasksWatcher.on('error', (err) => {
        console.error('Tasks watcher error:', err);
        this.tasksWatcher?.close();
        this.tasksWatcher = null;
        if (retryCount < WATCHER_RETRY_COUNT) {
          setTimeout(() => this.startTasksWatcher(retryCount + 1), WATCHER_RETRY_DELAY_MS);
        }
      });
    } catch (err) {
      console.error('Failed to start tasks watcher:', err);
      if (retryCount < WATCHER_RETRY_COUNT) {
        setTimeout(() => this.startTasksWatcher(retryCount + 1), WATCHER_RETRY_DELAY_MS);
      }
    }
  }

  private debounce(key: string, fn: () => void): void {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      fn();
    }, DEBOUNCE_MS));
  }
}
