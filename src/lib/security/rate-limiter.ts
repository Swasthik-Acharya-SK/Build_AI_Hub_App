interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Purge expired entries periodically and cap memory usage
const PURGE_INTERVAL_MS = 60_000;
const MAX_STORE_ENTRIES = 10_000;
let lastPurge = Date.now();

function purgeExpiredEntries(force = false): void {
  const now = Date.now();
  if (!force && now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  // Defense against unbounded memory growth during high-cardinality IP attacks
  if (rateLimitStore.size >= MAX_STORE_ENTRIES) {
    const keysToEvict = Array.from(rateLimitStore.keys()).slice(0, 2000);
    for (const key of keysToEvict) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter for server routes.
 *
 * NOTE FOR DISTRIBUTED PRODUCTION:
 * This in-memory limiter guards against rapid-fire abuse on a single server instance.
 * For distributed, multi-region serverless deployments (such as Vercel Edge / AWS Lambda),
 * pair this with an external persistent store such as Upstash Redis (@upstash/ratelimit).
 */
export function checkRateLimit(
  identifier: string,
  limit = 40,
  windowMs = 60_000
): RateLimitResult {
  purgeExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt <= now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
