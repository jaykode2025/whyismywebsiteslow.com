/**
 * Utility functions for handling timeouts and retries
 */

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
  return withRetryAndTimeout(() => fetch(url, options), {
    ...retryOptions,
    timeout: retryOptions.timeout || 15000 // Default 15s timeout for fetch
  });
}