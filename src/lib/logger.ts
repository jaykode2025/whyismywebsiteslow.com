type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (message: string, data?: any) => {
    if (isDev) console.debug(`[DEBUG] ${message}`, data || '');
  },
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  scan: (scanId: string, message: string, data?: any) => {
    console.info(`[SCAN:${scanId}] ${message}`, data || '');
  }
};