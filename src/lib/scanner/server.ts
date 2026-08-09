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
 */

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
 * Fetch with exponential backoff retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  let delayMs = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      // Retry on server errors and rate limits
      if (response.status >= 500 || response.status === 429) {
        if (attempt < config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs = Math.min(delayMs * 2, config.maxDelayMs);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, config.maxDelayMs);
        continue;
      }
    }
  }

  throw lastError || new Error(`Failed after ${config.maxRetries} retries`);
}

/**
 * Fetch real-user metrics from Chrome UX Report API
 */
async function fetchCrux(
  origin: string,
  device: Device,
  apiKey?: string
): Promise<RumData | null> {
  if (!apiKey) {
    console.warn('CrUX API key not configured');
    return null;
  }

  try {
    const url = new URL(CRUX_API_URL);
    url.searchParams.set('key', apiKey);

    const response = await fetchWithRetry(url.toString(), {
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
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.info(`No CrUX data available for ${origin}`);
        return null;
      }
      console.error(`CrUX API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const extracted = extractCruxMetrics(data);

    return (extracted as RumData) || null;
  } catch (error) {
    console.error('Error fetching CrUX data:', error);
    return null;
  }
}

/**
 * Fetch lab metrics from PageSpeed Insights / Lighthouse API
 */
async function fetchPsi(
  url: string,
  device: Device,
  apiKey?: string
): Promise<LabData | null> {
  if (!apiKey) {
    console.warn('PSI API key not configured');
    return null;
  }

  try {
    const psiUrl = new URL(PSI_API_URL);
    psiUrl.searchParams.set('url', url);
    psiUrl.searchParams.set('strategy', device === 'mobile' ? 'mobile' : 'desktop');
    psiUrl.searchParams.set('category', 'performance');
    psiUrl.searchParams.set('category', 'accessibility');
    psiUrl.searchParams.set('category', 'best-practices');
    psiUrl.searchParams.set('category', 'seo');
    psiUrl.searchParams.set('key', apiKey);

    const response = await fetchWithRetry(psiUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error(`PSI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const extracted = extractLighthouseMetrics(data);

    return (extracted as LabData) || null;
  } catch (error) {
    console.error('Error fetching PSI data:', error);
    return null;
  }
}

/**
 * Measure network performance via simple HEAD request
 * Note: This is a rough estimate. For more accurate measurements,
 * consider using Resource Timing API on the client side.
 */
async function measureNetwork(url: string): Promise<NetworkData> {
  try {
    const start = Date.now();

    const response = await fetchWithRetry(
      url,
      { method: 'HEAD', redirect: 'follow' },
      { ...DEFAULT_RETRY_CONFIG, maxRetries: 1 }
    );

    const ttfb = Date.now() - start;

    return {
      ttfb_ms: ttfb,
      redirect_count: response.redirected ? 1 : 0,
    };
  } catch (error) {
    console.error('Error measuring network performance:', error);
    // Return fallback data so scan can continue
    return {
      ttfb_ms: 9999,
      redirect_count: 0,
    };
  }
}

/**
 * Run the enhanced scanner using all available data sources
 */
export async function runEnhancedScanner(
  url: string,
  device: Device = 'mobile',
  apiKey?: string
): Promise<EnhancedScanResult> {
  const origin = new URL(url).origin;

  // Fetch all data in parallel
  const [rum, lab, network] = await Promise.all([
    fetchCrux(origin, device, apiKey),
    fetchPsi(url, device, apiKey),
    measureNetwork(url),
  ]);

  const overallScore = calculateOverallScore(rum, lab, network);
  const grade = getGrade(overallScore);

  const rumAvailable = !!rum;
  const labAvailable = !!lab;
  const networkAvailable = true;

  // Determine overall confidence based on data availability
  const confidence =
    rumAvailable && rum!.confidence === 'high'
      ? 'high'
      : rumAvailable || labAvailable
      ? 'medium'
      : 'low';

  return {
    rum: rum || {
      lcp_ms: undefined,
      inp_ms: undefined,
      cls: undefined,
      fcp_ms: undefined,
      ttfb_ms: undefined,
      status: 'poor',
      sampleSize: 0,
      confidence: 'low',
    },
    lab: lab || {
      lighthouse: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
      cwv: { status: 'poor' },
    },
    network,
    overallScore,
    grade,
    sources: {
      rumAvailable,
      labAvailable,
      networkAvailable,
    },
    confidence,
  };
}
