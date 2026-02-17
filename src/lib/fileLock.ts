import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger";

// Simple file locking mechanism using lock files
export class FileLock {
  private lockFilePath: string;
  private readonly maxWaitTime: number = 10000; // 10 seconds
  private readonly pollInterval: number = 100; // 100ms

  constructor(filePath: string, maxWaitTime?: number) {
    this.lockFilePath = `${filePath}.lock`;
    if (maxWaitTime !== undefined) {
      this.maxWaitTime = maxWaitTime;
    }
  }

  async acquire(): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.maxWaitTime) {
      try {
        // Try to create the lock file exclusively
        await fs.writeFile(this.lockFilePath, Date.now().toString(), { flag: 'wx' });
        return true;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, wait and try again
          await new Promise(resolve => setTimeout(resolve, this.pollInterval));
          continue;
        } else {
          logger.error(`Error acquiring lock:`, error);
          return false;
        }
      }
    }
    
    // Timeout reached
    logger.warn(`Timeout acquiring lock for ${this.lockFilePath}`);
    return false;
  }

  async release(): Promise<void> {
    try {
      await fs.unlink(this.lockFilePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error releasing lock:`, error);
      }
    }
  }

  async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const acquired = await this.acquire();
    if (!acquired) {
      throw new Error(`Could not acquire lock for ${this.lockFilePath}`);
    }

    try {
      return await operation();
    } finally {
      await this.release();
    }
  }
}