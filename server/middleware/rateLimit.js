/**
 * Rate-limiting foundation (in-memory).
 * Replace with durable store (Redis/Upstash) before high-traffic production auth.
 */
const buckets = new Map();

export function rateLimit({
  key,
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max = Number(process.env.RATE_LIMIT_MAX || 100),
} = {}) {
  const now = Date.now();
  const bucketKey = key || 'global';
  const current = buckets.get(bucketKey);

  if (!current || now > current.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return { allowed: true, remaining: max - current.count, resetAt: current.resetAt };
}

/** Test helper — clears in-memory buckets. */
export function resetRateLimitBuckets() {
  buckets.clear();
}

/**
 * Apply rate-limit response headers (and 429 body helper fields).
 */
export function applyRateLimitHeaders(res, limit) {
  if (!limit) return;
  if (limit.remaining != null) {
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit.remaining)));
  }
  if (!limit.allowed && limit.retryAfterSec) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
  }
}
