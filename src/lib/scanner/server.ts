import type { Device } from './enhanced';
import {
  getCwvStatus,
  calculateOverallScore,
  getGrade,
  extractCruxMetrics,
  extractLighthouseMetrics,
  type RumData,
  type LabData,
  type NetworkData,
  type EnhancedScanResult,
} from './enhanced';
import { getCache, setCache, getCacheKey } from '../cache';
import { logger } from '../logger';

const CRUX_API_URL = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 3000,
  timeoutMs: 10000,
};

/**
 * SERVER-SIDE SCANNER
 *
 * This module handles all API calls for scanner data collection.
 * It runs on the server, so API keys are secure and not exposed to clients.
 *
 * All network calls include:
 * - Retry logic for transient failures
 * - Timeout enforcement
 * - Error handling and logging
 * - Metric validation
 * - CACHING for CrUX data (30 minutes TTL)
 */

import { env } from '../env';
import { fetchWithRetry } from '../retry';

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export async function fetchCruxData(
  url: string,
  device: Device
): Promise<RumData | null> {
  const origin = getOrigin(url);
  if (!origin) return null;

  // Check cache first (CrUX data is stable for days/weeks, 30min TTL is safe)
  const cacheKey = getCacheKey('crux', origin, device);
  const cached = getCache<RumData>(cacheKey);
  if (cached) {
    logger.debug(`CrUX cache hit for ${origin}`);
    return cached;
  }

  const apiKey = env.PSI_API_KEY() || undefined;
  if (!apiKey) {
    logger.warn('CrUX API key not configured');
    return null;
  }

  try {
    const url = new URL(CRUX_API_URL);
    url.searchParams.set('key', apiKey);

    const response = await fetchWithRetry(
      url.toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          formFactor: device === 'mobile' ? 'PHONE' : 'DESKTOP',
          metrics: [
            'largest_contentful_paint',
            'interaction_to_next_paint',
            'cumulative_layout_shift',
            'first_contentful_paint',
            'experimental_time_to_first_byte',
          ],
        }),
      },
      { maxRetries: 1, timeout: 10000 }
    );

    if (!response.ok) {
      if (response.status === 404) {
        logger.info(`No CrUX data available for ${origin}`);
        return null;
      }
      logger.warn(`CrUX API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const metrics = extractCruxMetrics(data);

    // Cache the result for 30 minutes
    setCache(cacheKey, metrics, 30 * 60);
    logger.debug(`Cached CrUX data for ${origin}`);

    return metrics;
  } catch (error) {
    logger.error('Error fetching CrUX data:', error);
    return null;
  }
}

export async function fetchLighthouseData(
  url: string,
  device: Device
): Promise<LabData | null> {
  const cacheKey = getCacheKey('lighthouse', url, device);
  const cached = getCache<LabData>(cacheKey);
  if (cached) {
    logger.debug(`Lighthouse cache hit for ${url}`);
    return cached;
  }

  const apiKey = env.PSI_API_KEY() || undefined;
  try {
    const params = new URL(PSI_API_URL);
    params.searchParams.set('url', url);
    params.searchParams.set('strategy', device);
    if (apiKey) params.searchParams.set('key', apiKey);

    const response = await fetchWithRetry(
      params.toString(),
      {
        headers: { 'Content-Type': 'application/json' },
      },
      DEFAULT_RETRY_CONFIG
    );

    if (!response.ok) {
      logger.warn(`PSI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const metrics = extractLighthouseMetrics(data);

    // Cache for 1 hour (Lighthouse varies more than CrUX)
    setCache(cacheKey, metrics, 60 * 60);
    logger.debug(`Cached Lighthouse data for ${url}`);

    return metrics;
  } catch (error) {
    logger.error('Error fetching Lighthouse data:', error);
    return null;
  }
}

export async function fetchNetworkData(
  url: string,
  device: Device
): Promise<NetworkData | null> {
  const cacheKey = getCacheKey('network', url, device);
  const cached = getCache<NetworkData>(cacheKey);
  if (cached) {
    logger.debug(`Network cache hit for ${url}`);
    return cached;
  }

  try {
    const response = await fetchWithRetry(
      url,
      {
        headers: { 'User-Agent': 'WMSSBot/0.1' },
      },
      { maxRetries: 1, timeout: 8000 }
    );

    if (!response.ok) {
      return null;
    }

    const networkData: NetworkData = {
      statusCode: response.status,
      transferSize: response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length')!, 10)
        : 0,
      responseTime: 0, // Would need timing API
    };

    // Cache network data for 5 minutes
    setCache(cacheKey, networkData, 5 * 60);
    return networkData;
  } catch (error) {
    logger.error('Error fetching network data:', error);
    return null;
  }
}
