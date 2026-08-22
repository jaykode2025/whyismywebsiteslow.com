/**
 * Utility functions for handling timeouts and retries
 */
import { isBlockedHostname } from "./validate";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

/**
 * Fetches a URL while re-validating every redirect hop against the SSRF
 * blocklist. Plain `fetch()` follows redirects transparently, which means a
 * validated public URL could 302 to an internal address (e.g. the cloud
 * metadata IP) and have that response silently returned to the caller. This
 * fetches with `redirect: "manual"` and only follows a hop after confirming
 * its hostname isn't internal/private.
 */
export async function fetchSafely(input: string, options: RequestInit = {}): Promise<Response> {
  let currentUrl = new URL(input);
  if (isBlockedHostname(currentUrl.hostname)) {
    throw new Error("Blocked internal URL");
  }

  let response = await fetch(currentUrl.toString(), { ...options, redirect: "manual" });
  let hops = 0;

  while (REDIRECT_STATUSES.has(response.status) && hops < MAX_REDIRECTS) {
    const location = response.headers.get("location");
    if (!location) break;

    currentUrl = new URL(location, currentUrl);
    if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
      throw new Error("Blocked redirect protocol");
    }
    if (isBlockedHostname(currentUrl.hostname)) {
      throw new Error("Redirect target blocked (internal URL)");
    }

    hops += 1;
    response = await fetch(currentUrl.toString(), { ...options, redirect: "manual" });
  }

  return response;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // in ms
  maxDelay?: number; // in ms
  factor?: number; // exponential backoff factor
  timeout?: number; // per-attempt timeout in ms
}

/**
 * Executes an async function with retry logic and timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    timeout = 30000
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the function once per attempt
      const mainPromise = fn();
      
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
        
        // Clear timeout if the main promise resolves first
        mainPromise.finally(() => clearTimeout(timer));
      });

      // Race the main function call against the timeout
      const result = await Promise.race([mainPromise, timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        // Last attempt, throw the error
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
      await sleep(delay);
    }
  }

  // This shouldn't be reached, but TypeScript wants it
  throw lastError!;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout and retry
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetryAndTimeout(() => fetchSafely(url, options), {
    ...retryOptions,
    timeout: retryOptions.timeout || 15000 // Default 15s timeout for fetch
  });
}