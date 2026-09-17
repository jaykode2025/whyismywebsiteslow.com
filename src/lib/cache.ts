/**
 * Tiny in-process TTL cache.
 *
 * Scoped to a single serverless instance - it is a latency/quota optimisation
 * for repeated reads within a warm instance, never a source of truth and never
 * shared across instances. Do not use it for anything correctness-sensitive.
 */

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;

/** Build a namespaced cache key from its parts. */
export function getCacheKey(...parts: Array<string | number>): string {
  return parts.join(":");
}

export function getCache<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

/** @param ttlSeconds time-to-live in seconds. */
export function setCache(key: string, value: unknown, ttlSeconds: number): void {
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, entry] of store) {
      if (entry.expires <= now) store.delete(k);
    }
    // Still full of live entries - evict the oldest insertion.
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
  }
  store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

/** Drop one key, or the whole cache when called with no argument. */
export function clearCache(key?: string): void {
  if (key === undefined) store.clear();
  else store.delete(key);
}
