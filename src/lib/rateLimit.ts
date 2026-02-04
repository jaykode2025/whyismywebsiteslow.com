const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 12;
const MAX_BUCKETS = 10000;

// Clean up old buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
    }
  }
  // Prevent memory leaks by limiting total buckets
  if (buckets.size > MAX_BUCKETS) {
    const entries = Array.from(buckets.entries());
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toDelete = entries.slice(0, buckets.size - MAX_BUCKETS);
    for (const [key] of toDelete) {
      buckets.delete(key);
    }
  }
}, 300_000); // Clean every 5 minutes

export function rateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: LIMIT - 1, resetAt: now + WINDOW_MS };
  }
  if (bucket.count >= LIMIT) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: LIMIT - bucket.count, resetAt: bucket.resetAt };
}
