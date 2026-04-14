/**
 * Simple in-memory sliding-window rate limiter for Vercel serverless.
 *
 * Each cold-start instance gets its own store — this is per-instance
 * limiting (better than nothing). For proper distributed rate limiting,
 * upgrade to @upstash/ratelimit with Redis.
 */

interface RateLimitConfig {
  /** Unique name for this limiter (e.g. "ai-score") */
  name: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the oldest entry in the window expires */
  resetAt: number;
}

interface Entry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, Entry>>();

const MAX_KEYS_PER_STORE = 10_000;

function getStore(name: string): Map<string, Entry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

function prune(store: Map<string, Entry>, windowMs: number): void {
  if (store.size <= MAX_KEYS_PER_STORE) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export function rateLimit(config: RateLimitConfig, key: string): RateLimitResult {
  const windowMs = config.windowSeconds * 1000;
  const store = getStore(config.name);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= config.limit) {
    const oldest = entry.timestamps[0];
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);

  // Periodic cleanup
  prune(store, windowMs);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
    resetAt: entry.timestamps[0] + windowMs,
  };
}
