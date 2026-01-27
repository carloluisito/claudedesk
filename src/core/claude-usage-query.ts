import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ClaudeUsageQuota } from '../types.js';
import { settingsManager } from '../config/settings.js';
import { decrypt, isEncryptedDataEmpty } from '../utils/encryption.js';

/**
 * Claude Code stats cache data structure (from ~/.claude/stats-cache.json)
 */
interface ClaudeStatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;
  dailyModelTokens: Array<{
    date: string;
    tokensByModel: Record<string, number>;
  }>;
  modelUsage: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    webSearchRequests: number;
    costUSD: number;
    contextWindow?: number;
    maxOutputTokens?: number;
  }>;
  totalSessions: number;
  totalMessages: number;
  longestSession?: {
    sessionId: string;
    duration: number;
    messageCount: number;
    timestamp: string;
  };
  firstSessionDate?: string;
  hourCounts?: Record<string, number>;
}

/**
 * Processed usage data for display
 */
export interface ClaudeUsageStats {
  // Today's activity
  today: {
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
    tokensByModel: Record<string, number>;
  };
  // This week's activity (last 7 days)
  week: {
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
    tokensByModel: Record<string, number>;
  };
  // All-time model usage
  modelUsage: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  }>;
  // Totals
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: string | null;
  lastUpdated: string;
}

// Cache for usage data
let cachedStats: ClaudeUsageStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds cache

/**
 * Get the path to Claude Code's stats-cache.json file
 */
function getStatsCachePath(): string {
  return join(homedir(), '.claude', 'stats-cache.json');
}

/**
 * Parse the stats-cache.json and compute usage stats
 */
function parseStatsCache(raw: ClaudeStatsCache): ClaudeUsageStats {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calculate week start (Sunday)
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  // Today's activity
  const todayActivity = raw.dailyActivity.find(d => d.date === todayStr);
  const todayTokens = raw.dailyModelTokens.find(d => d.date === todayStr);

  // Week's activity (sum of last 7 days from week start)
  const weekActivity = raw.dailyActivity
    .filter(d => new Date(d.date) >= weekStart)
    .reduce((acc, day) => ({
      messageCount: acc.messageCount + day.messageCount,
      sessionCount: acc.sessionCount + day.sessionCount,
      toolCallCount: acc.toolCallCount + day.toolCallCount,
    }), { messageCount: 0, sessionCount: 0, toolCallCount: 0 });

  // Week's tokens by model
  const weekTokensByModel: Record<string, number> = {};
  raw.dailyModelTokens
    .filter(d => new Date(d.date) >= weekStart)
    .forEach(day => {
      Object.entries(day.tokensByModel).forEach(([model, tokens]) => {
        weekTokensByModel[model] = (weekTokensByModel[model] || 0) + tokens;
      });
    });

  return {
    today: {
      messageCount: todayActivity?.messageCount || 0,
      sessionCount: todayActivity?.sessionCount || 0,
      toolCallCount: todayActivity?.toolCallCount || 0,
      tokensByModel: todayTokens?.tokensByModel || {},
    },
    week: {
      ...weekActivity,
      tokensByModel: weekTokensByModel,
    },
    modelUsage: Object.fromEntries(
      Object.entries(raw.modelUsage).map(([model, usage]) => [
        model,
        {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cacheReadInputTokens,
          cacheCreationTokens: usage.cacheCreationInputTokens,
        },
      ])
    ),
    totalSessions: raw.totalSessions,
    totalMessages: raw.totalMessages,
    firstSessionDate: raw.firstSessionDate || null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Query Claude Code's local stats cache file.
 * Results are cached for 30 seconds.
 *
 * @param forceRefresh - If true, bypasses the cache
 * @returns Parsed usage stats, or null if unavailable
 */
export async function queryClaudeUsage(forceRefresh = false): Promise<ClaudeUsageStats | null> {
  const now = Date.now();

  // Return cached data if still valid
  if (!forceRefresh && cachedStats && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedStats;
  }

  try {
    const statsPath = getStatsCachePath();

    if (!existsSync(statsPath)) {
      console.log('[claude-usage-query] Stats cache file not found:', statsPath);
      return cachedStats; // Return stale cache if available
    }

    const content = readFileSync(statsPath, 'utf-8');
    const raw: ClaudeStatsCache = JSON.parse(content);

    const parsed = parseStatsCache(raw);
    cachedStats = parsed;
    cacheTimestamp = now;

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      console.log('[claude-usage-query] Error reading stats cache:', error.message);
    }
    return cachedStats; // Return stale cache if available
  }
}

/**
 * Clear the usage cache.
 */
export function clearUsageCache(): void {
  cacheTimestamp = 0;
}

/**
 * Check if Claude usage data is available.
 */
export async function hasClaudeUsage(): Promise<boolean> {
  const stats = await queryClaudeUsage();
  return stats !== null;
}

/**
 * Format model name for display (extract short name)
 */
export function formatModelName(modelId: string): string {
  if (modelId.includes('opus')) return 'Opus';
  if (modelId.includes('sonnet')) return 'Sonnet';
  if (modelId.includes('haiku')) return 'Haiku';
  return modelId.split('-').slice(1, 3).join(' ');
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`;
  if (tokens < 1_000_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  return `${(tokens / 1_000_000_000).toFixed(2)}B`;
}

// ============================================================================
// Claude OAuth Quota API
// ============================================================================

// Cache for quota data
let cachedQuota: ClaudeUsageQuota | null = null;
let quotaCacheTimestamp = 0;
const QUOTA_CACHE_TTL_MS = 60_000; // 1 minute cache

/**
 * Credential storage structure for Claude Code
 * Located at ~/.claude/.credentials.json
 */
interface ClaudeCredentialsFile {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    scopes: string[];
    subscriptionType: string;
    rateLimitTier: string;
  };
}

/**
 * Get Claude Code OAuth token from local storage.
 *
 * Priority order:
 * 1. Manual token from settings (if configured)
 * 2. ~/.claude/.credentials.json
 * 3. ~/.claude/credentials.json (legacy)
 */
export async function getClaudeOAuthToken(): Promise<string | null> {
  // Check for manual token in settings first
  try {
    const claudeTokenSettings = settingsManager.getClaudeToken();
    if (!isEncryptedDataEmpty(claudeTokenSettings)) {
      const decryptedToken = decrypt({
        encryptedText: claudeTokenSettings.encryptedToken,
        iv: claudeTokenSettings.iv,
        tag: claudeTokenSettings.tag,
      });

      if (decryptedToken) {
        console.log('[claude-usage-query] Using manual token from settings');
        return decryptedToken;
      }
    }
  } catch (error) {
    console.log('[claude-usage-query] Error reading manual token:', error);
  }

  // Credential file paths to check (in priority order)
  const credentialPaths = [
    join(homedir(), '.claude', '.credentials.json'),  // Standard path with .json
    join(homedir(), '.claude', '.credentials'),        // Windows may omit .json extension
    join(homedir(), '.claude', 'credentials.json'),   // Legacy path without dot prefix
  ];

  for (const credentialsPath of credentialPaths) {
    if (existsSync(credentialsPath)) {
      try {
        const content = readFileSync(credentialsPath, 'utf-8');
        const creds = JSON.parse(content);

        // Try claudeAiOauth.accessToken first, then root-level accessToken (legacy)
        const token = creds.claudeAiOauth?.accessToken || creds.accessToken;

        if (token) {
          // Check if token is expired (if expiry info available)
          if (creds.claudeAiOauth?.expiresAt) {
            const expiresAt = new Date(creds.claudeAiOauth.expiresAt);
            if (expiresAt <= new Date()) {
              console.log('[claude-usage-query] OAuth token is expired');
              // Token is expired, but we'll still try it - the API will tell us for sure
            }
          }

          console.log(`[claude-usage-query] Found token in ${credentialsPath}`);
          return token;
        }
      } catch (error) {
        console.log(`[claude-usage-query] Error reading ${credentialsPath}:`, error);
      }
    }
  }

  console.log('[claude-usage-query] No OAuth token found');
  return null;
}

/**
 * Query Claude usage quota from the Anthropic OAuth API.
 *
 * This calls: GET https://api.anthropic.com/api/oauth/usage
 * Returns the 5-hour and 7-day utilization buckets.
 *
 * @param forceRefresh - If true, bypasses the cache
 */
export async function queryClaudeQuota(forceRefresh = false): Promise<ClaudeUsageQuota | null> {
  const now = Date.now();

  // Return cached data if still valid
  if (!forceRefresh && cachedQuota && (now - quotaCacheTimestamp) < QUOTA_CACHE_TTL_MS) {
    return cachedQuota;
  }

  try {
    const token = await getClaudeOAuthToken();
    if (!token) {
      console.log('[claude-usage-query] No OAuth token available for quota query');
      return cachedQuota; // Return stale cache if available
    }

    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[claude-usage-query] Quota API error (${response.status}):`, errorText);
      return cachedQuota; // Return stale cache
    }

    const data = await response.json();

    // Parse the response - API returns utilization as 0-100, we normalize to 0-1
    const quota: ClaudeUsageQuota = {
      five_hour: {
        utilization: (data.five_hour?.utilization ?? 0) / 100,
        resets_at: data.five_hour?.resets_at ?? new Date().toISOString(),
      },
      seven_day: {
        utilization: (data.seven_day?.utilization ?? 0) / 100,
        resets_at: data.seven_day?.resets_at ?? new Date().toISOString(),
      },
      lastUpdated: new Date().toISOString(),
    };

    cachedQuota = quota;
    quotaCacheTimestamp = now;

    console.log('[claude-usage-query] Quota fetched successfully:', {
      fiveHour: `${(quota.five_hour.utilization * 100).toFixed(1)}%`,
      sevenDay: `${(quota.seven_day.utilization * 100).toFixed(1)}%`,
    });

    return quota;
  } catch (error) {
    if (error instanceof Error) {
      console.log('[claude-usage-query] Error fetching quota:', error.message);
    }
    return cachedQuota; // Return stale cache if available
  }
}

/**
 * Clear the quota cache.
 */
export function clearQuotaCache(): void {
  quotaCacheTimestamp = 0;
}

/**
 * Check if Claude quota data is available.
 */
export async function hasClaudeQuota(): Promise<boolean> {
  const quota = await queryClaudeQuota();
  return quota !== null;
}

/**
 * Format quota percentage for display
 */
export function formatQuotaPercent(utilization: number): string {
  return `${(utilization * 100).toFixed(1)}%`;
}

/**
 * Get time until quota reset in human-readable format
 */
export function getTimeUntilReset(resetsAt: string): string {
  const now = new Date();
  const resetTime = new Date(resetsAt);
  const diffMs = resetTime.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
