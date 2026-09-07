// In-memory cache with TTL support (fallback when Redis unavailable)
// For production: use Vercel KV (Redis) via environment variables

import { logger } from "./logger";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const localCache = new Map<string, CacheEntry<any>>();
const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const expired: string[] = [];
  
  for (const [key, entry] of localCache.entries()) {
    if (entry.expiresAt < now) {
      expired.push(key);
    }
  }
  
  // Remove oldest entries if cache is too large
  if (localCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(localCache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toDelete = entries.slice(0, localCache.size - MAX_CACHE_SIZE);
    for (const [key] of toDelete) {
      localCache.delete(key);
    }
  }
  
  for (const key of expired) {
    localCache.delete(key);
  }
  
  if (expired.length > 0) {
    logger.debug(`Cache cleanup: removed ${expired.length} expired entries`);
  }
}, CLEANUP_INTERVAL);

export function getCacheKey(...parts: string[]): string {
  return parts.join(":");
}

export function getCache<T>(key: string): T | null {
  const entry = localCache.get(key);
  if (!entry) return null;
  
  if (entry.expiresAt < Date.now()) {
    localCache.delete(key);
    return null;
  }
  
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlSeconds: number): void {
  localCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function deleteCache(key: string): void {
  localCache.delete(key);
}

export function clearCache(): void {
  localCache.clear();
}

// Memoize async function with cache
export function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const cached = getCache<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetcher();
    setCache(key, value, ttlSeconds);
    return value;
  };
}
