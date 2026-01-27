import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ClaudeSession {
  id: string;
  summary: string;
  timestamp: Date;
  messageCount: number;
  branch?: string;
  filePath: string;
}

/**
 * Convert a repo path to Claude's project folder name format
 * e.g., C:\Users\carlo\Desktop\repos\my-app -> C--Users-carlo-Desktop-repos-my-app
 */
function pathToClaudeProjectName(repoPath: string): string {
  // Claude converts:
  // - Colon (:) to dash (-)
  // - Backslash (\) to dash (-)
  // - Forward slash (/) to dash (-)
  // So C:\Users\carlo becomes C--Users-carlo (colon and backslash both become dashes)
  return repoPath
    .replace(/:/g, '-')
    .replace(/\\/g, '-')
    .replace(/\//g, '-');
}

/**
 * Get the Claude projects directory
 */
function getClaudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects');
}

/**
 * Read all Claude sessions for a given repository path
 */
export function getClaudeSessions(repoPath: string): ClaudeSession[] {
  const projectsDir = getClaudeProjectsDir();
  const projectName = pathToClaudeProjectName(repoPath);
  const projectDir = join(projectsDir, projectName);

  console.log(`[ClaudeSessionReader] Looking for sessions:`);
  console.log(`[ClaudeSessionReader]   Repo path: ${repoPath}`);
  console.log(`[ClaudeSessionReader]   Project name: ${projectName}`);
  console.log(`[ClaudeSessionReader]   Project dir: ${projectDir}`);

  if (!existsSync(projectDir)) {
    console.log(`[ClaudeSessionReader] No Claude project folder found at ${projectDir}`);
    return [];
  }

  const sessions: ClaudeSession[] = [];

  try {
    const files = readdirSync(projectDir);

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;

      const filePath = join(projectDir, file);
      const sessionId = file.replace('.jsonl', '');

      try {
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length === 0) continue;

        // Parse session data
        let summary = '';
        let branch: string | undefined;
        let messageCount = 0;
        let firstUserMessage = '';
        let lastTimestamp: Date | undefined;

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            // Get the first user message as the title (like Claude Code does)
            if (data.type === 'user' && data.message?.role === 'user' && data.message?.content) {
              messageCount++;
              if (!firstUserMessage) {
                // Extract first user message content
                const content = typeof data.message.content === 'string'
                  ? data.message.content
                  : Array.isArray(data.message.content)
                    ? data.message.content.find((c: { type: string; content?: string }) => c.type === 'text')?.content || ''
                    : '';
                firstUserMessage = content.split('\n')[0].trim(); // First line only
              }
              // Track timestamp
              if (data.timestamp) {
                lastTimestamp = new Date(data.timestamp);
              }
            }

            // Count assistant messages too
            if (data.type === 'assistant' && data.message?.role === 'assistant') {
              messageCount++;
              if (data.timestamp) {
                lastTimestamp = new Date(data.timestamp);
              }
            }

            // Get git branch
            if (data.gitBranch && !branch) {
              branch = data.gitBranch;
            }

            // Also check for summaries as fallback
            if (data.type === 'summary' && data.summary && !summary) {
              summary = data.summary;
            }
          } catch {
            // Skip unparseable lines
          }
        }

        // Use first user message as title, fall back to summary
        const displayTitle = firstUserMessage || summary || 'Untitled session';

        sessions.push({
          id: sessionId,
          summary: displayTitle,
          timestamp: lastTimestamp || stat.mtime,
          messageCount,
          branch,
          filePath,
        });
      } catch (error) {
        console.error(`[ClaudeSessionReader] Error reading session ${file}:`, error);
      }
    }

    // Sort by timestamp (most recent first)
    sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`[ClaudeSessionReader] Found ${sessions.length} sessions for ${repoPath}`);
    return sessions;
  } catch (error) {
    console.error('[ClaudeSessionReader] Error reading sessions:', error);
    return [];
  }
}

/**
 * Format relative time (e.g., "10 minutes ago", "3 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Format session list for display (similar to Claude Code's /resume output)
 */
export function formatSessionList(sessions: ClaudeSession[], limit: number = 20): string {
  if (sessions.length === 0) {
    return '*No Claude sessions found for this repository.*\n\nStart a conversation to create your first session.';
  }

  const displaySessions = sessions.slice(0, limit);

  const lines = displaySessions.map((session, index) => {
    const relTime = formatRelativeTime(session.timestamp);
    const msgCount = session.messageCount;
    const branch = session.branch ? ` · ${session.branch}` : '';

    // Truncate summary if too long
    const maxSummaryLen = 80;
    const summary = session.summary.length > maxSummaryLen
      ? session.summary.slice(0, maxSummaryLen) + '...'
      : session.summary;

    return `**${index + 1}.** ${summary}\n   _${relTime} · ${msgCount} messages${branch}_`;
  });

  const header = `**Resume Session** _(${sessions.length} sessions)_\n`;
  const footer = sessions.length > limit
    ? `\n\n_Showing ${limit} of ${sessions.length} sessions_`
    : '';

  const instructions = '\n\n_Type \`/resume <number>\` to resume a session, or use tabs to switch ClaudeDesk sessions._';

  return header + '\n' + lines.join('\n\n') + footer + instructions;
}

/**
 * Get a specific session by index (1-based) or ID
 */
export function getSessionByRef(sessions: ClaudeSession[], ref: string): ClaudeSession | undefined {
  // Try as number first (1-based index)
  const num = parseInt(ref, 10);
  if (!isNaN(num) && num > 0 && num <= sessions.length) {
    return sessions[num - 1];
  }

  // Try as session ID
  return sessions.find(s => s.id === ref || s.id.startsWith(ref));
}
