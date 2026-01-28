const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 12;

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
