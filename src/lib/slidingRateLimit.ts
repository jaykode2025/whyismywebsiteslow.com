import { logger } from "./logger";

// Sliding window rate limiter
interface RateLimitBucket {
  count: number;
  windowStart: number; // timestamp in ms
  history: Array<{ timestamp: number; count: number }>; // for sliding window calculation
}

const buckets = new Map<string, RateLimitBucket>();
const WINDOW_MS = 60_000; // 1 minute
const LIMIT = 12;
const MAX_BUCKETS = 10000;

// Clean up old buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    // Remove buckets older than 2 windows to clean up
    const cutoff = now - (2 * WINDOW_MS);
    bucket.history = bucket.history.filter(entry => entry.timestamp > cutoff);
    
    // If history is empty and window is old, remove the bucket
    if (bucket.history.length === 0 && (now - bucket.windowStart) > WINDOW_MS) {
      buckets.delete(key);
    }
  }
  // Prevent memory leaks by limiting total buckets
  if (buckets.size > MAX_BUCKETS) {
    const entries = Array.from(buckets.entries());
    entries.sort((a, b) => a[1].windowStart - b[1].windowStart);
    const toDelete = entries.slice(0, buckets.size - MAX_BUCKETS);
    for (const [key] of toDelete) {
      buckets.delete(key);
    }
  }
}, 300_000); // Clean every 5 minutes

export function rateLimit(key: string) {
  const now = Date.now();
  let bucket = buckets.get(key);
  
  if (!bucket) {
    // Create new bucket
    bucket = {
      count: 1,
      windowStart: now,
      history: [{ timestamp: now, count: 1 }]
    };
    buckets.set(key, bucket);
    return { 
      ok: true, 
      remaining: LIMIT - 1, 
      resetAt: now + WINDOW_MS,
      limit: LIMIT
    };
  }
  
  // Calculate requests in the sliding window
  const windowStart = now - WINDOW_MS;
  const recentRequests = bucket.history
    .filter(entry => entry.timestamp > windowStart)
    .reduce((sum, entry) => sum + entry.count, 0);
  
  if (recentRequests >= LIMIT) {
    // Rate limit exceeded
    return { 
      ok: false, 
      remaining: 0, 
      resetAt: bucket.windowStart + WINDOW_MS,
      limit: LIMIT
    };
  }
  
  // Add this request to history
  const lastEntry = bucket.history[bucket.history.length - 1];
  if (lastEntry && (now - lastEntry.timestamp) < 1000) { // Same second, increment count
    lastEntry.count++;
  } else { // New second, add new entry
    bucket.history.push({ timestamp: now, count: 1 });
  }
  
  const remaining = LIMIT - (recentRequests + 1);
  return { 
    ok: true, 
    remaining: Math.max(0, remaining), 
    resetAt: bucket.windowStart + WINDOW_MS,
    limit: LIMIT
  };
}

// Alternative: Fixed window rate limiter (simpler but less smooth)
export function fixedWindowRateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  
  if (!bucket || bucket.windowStart + WINDOW_MS < now) {
    // Reset or create new bucket
    buckets.set(key, { 
      count: 1, 
      windowStart: now, 
      history: [{ timestamp: now, count: 1 }] 
    });
    return { 
      ok: true, 
      remaining: LIMIT - 1, 
      resetAt: now + WINDOW_MS 
    };
  }
  
  if (bucket.count >= LIMIT) {
    return { 
      ok: false, 
      remaining: 0, 
      resetAt: bucket.windowStart + WINDOW_MS 
    };
  }
  
  bucket.count += 1;
  buckets.set(key, bucket);
  return { 
    ok: true, 
    remaining: LIMIT - bucket.count, 
    resetAt: bucket.windowStart + WINDOW_MS 
  };
}