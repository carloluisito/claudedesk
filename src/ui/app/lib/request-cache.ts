/**
 * Request Cache - Deduplicates in-flight requests and caches responses
 *
 * Features:
 * - In-flight deduplication: same request returns same promise
 * - Response caching with configurable stale time
 * - Cache invalidation support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, InFlightRequest<unknown>>();

  /**
   * Execute a request with deduplication and caching
   *
   * @param key - Unique cache key for this request
   * @param fetcher - Function that performs the actual request
   * @param options - Configuration options
   * @returns Promise resolving to the cached or fetched data
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      staleTime?: number;  // How long cached data is considered fresh (ms), default 30s
      forceRefresh?: boolean;  // Bypass cache and fetch fresh data
    } = {}
  ): Promise<T> {
    const { staleTime = 30000, forceRefresh = false } = options;

    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      const cached = this.cache.get(key) as CacheEntry<T> | undefined;
      if (cached && Date.now() - cached.timestamp < cached.staleTime) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[RequestCache] HIT (cache): ${key}`);
        }
        return cached.data;
      }
    }

    // Check for in-flight request
    const inFlight = this.inFlight.get(key) as InFlightRequest<T> | undefined;
    if (inFlight) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RequestCache] HIT (in-flight): ${key}`);
      }
      return inFlight.promise;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[RequestCache] MISS: ${key} - fetching...`);
    }

    // Create new request
    const promise = fetcher()
      .then((data) => {
        // Store in cache
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          staleTime,
        });
        return data;
      })
      .finally(() => {
        // Remove from in-flight
        this.inFlight.delete(key);
      });

    // Track in-flight request
    this.inFlight.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if a key has valid cached data
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < cached.staleTime;
  }

  /**
   * Get cached data without fetching (returns undefined if not cached or stale)
   */
  get<T>(key: string): T | undefined {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!cached) return undefined;
    if (Date.now() - cached.timestamp >= cached.staleTime) return undefined;
    return cached.data;
  }
}

// Singleton instance for app-wide request caching
export const requestCache = new RequestCache();

// Cache keys constants
export const CACHE_KEYS = {
  APP_DATA: 'app:data',
  TERMINAL_SESSIONS: 'terminal:sessions',
  GIT_STATUS: (sessionId: string) => `git:status:${sessionId}`,
  HEALTH_STATUS: 'health:status',
} as const;
