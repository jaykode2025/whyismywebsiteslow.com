/**
 * ENHANCED SCANNER - Type definitions and utilities
 * 
 * This module contains type definitions and utility functions for the enhanced scanner.
 * All API calls should happen via the /api/scan-enhanced endpoint (server-side) for security.
 * 
 * Sources:
 * 1. CrUX API - Real-user metrics from actual Chrome users (28-day aggregated)
 * 2. PSI/Lighthouse - Lab metrics + detailed audits (single run, standardized)
 * 3. Manual checks - TTFB, DNS, TLS, redirects via Resource Timing API
 */

export type Device = 'mobile' | 'desktop';

export interface RumData {
  lcp_ms?: number;
  inp_ms?: number;
  cls?: number;
  fcp_ms?: number;
  ttfb_ms?: number;
  status: 'pass' | 'needs-improvement' | 'poor';
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface LabData {
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  cwv: {
    lcp_ms?: number;
    inp_ms?: number;
    cls?: number;
    status: 'pass' | 'needs-improvement' | 'poor';
  };
}

export interface NetworkData {
  ttfb_ms?: number;
  dns_ms?: number;
  tls_ms?: number;
  redirect_count?: number;
  redirect_time_ms?: number;
  total_requests?: number;
  total_size_bytes?: number;
}

export interface EnhancedScanResult {
  rum: RumData;
  lab: LabData;
  network: NetworkData;
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sources: {
    rumAvailable: boolean;
    labAvailable: boolean;
    networkAvailable: boolean;
  };
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Determines Core Web Vitals status based on official Google thresholds
 * https://web.dev/vitals/
 */
export function getCwvStatus(
  lcp?: number,
  inp?: number,
  cls?: number
): 'pass' | 'needs-improvement' | 'poor' {
  if (lcp === undefined || inp === undefined || cls === undefined) {
    return 'poor';
  }

  // Good (pass): LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1
  if (lcp <= 2500 && inp <= 200 && cls <= 0.1) {
    return 'pass';
  }

  // Needs improvement: LCP ≤ 4s, INP ≤ 500ms, CLS ≤ 0.25
  if (lcp <= 4000 && inp <= 500 && cls <= 0.25) {
    return 'needs-improvement';
  }

  return 'poor';
}

/**
 * Calculate overall performance score using weighted average
 * Weights: RUM 60%, Lab 30%, Network 10%
 * 
 * Within RUM: LCP 45%, INP 30%, CLS 25% (official Google weights)
 */
export function calculateOverallScore(
  rum: RumData | null,
  lab: LabData | null,
  network: NetworkData
): number {
  let score = 70; // baseline if no data available
  let weights = 0;

  // RUM score (highest priority - real users)
  if (rum && rum.lcp_ms !== undefined && rum.inp_ms !== undefined) {
    // Normalize metrics to 0-100 scale using official thresholds
    const lcpScore = Math.max(0, 100 - (rum.lcp_ms / 25)); // 2500ms = 0, 0ms = 100
    const inpScore = Math.max(0, 100 - (rum.inp_ms / 2)); // 200ms = 0, 0ms = 100
    const clsScore = Math.max(0, 100 - (rum.cls || 0) * 400); // 0.1 = 0, 0 = 100

    // Apply official CWV weights
    const rumScore = (lcpScore * 0.45) + (inpScore * 0.3) + (clsScore * 0.25);
    score = (score * (1 - 0.6)) + (rumScore * 0.6);
    weights += 0.6;
  }

  // Lab score (lab conditions - Lighthouse performance score already 0-100)
  if (lab) {
    score = (score * (1 - 0.3)) + (lab.lighthouse.performance * 0.3);
    weights += 0.3;
  }

  // Network penalty (TTFB impact)
  if (network.ttfb_ms !== undefined) {
    if (network.ttfb_ms > 1000) {
      score -= 20; // severe penalty for >1s TTFB
    } else if (network.ttfb_ms > 600) {
      score -= 10; // moderate penalty for >600ms TTFB
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Convert numerical score to letter grade
 */
export function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Validate metrics are within reasonable ranges
 */
export function isValidMetric(value: unknown, min: number, max: number): boolean {
  if (typeof value !== 'number') return false;
  return value >= min && value <= max && Number.isFinite(value);
}

/**
 * Safe extraction of CrUX API response with validation
 */
export function extractCruxMetrics(data: any): Partial<RumData> | null {
  try {
    const record = data?.record;
    if (!record?.metrics) return null;

    const metrics = record.metrics;
    const lcp = metrics.largest_contentful_paint?.percentiles?.p75;
    const inp = metrics.interaction_to_next_paint?.percentiles?.p75;
    const cls = metrics.cumulative_layout_shift?.percentiles?.p75;
    const fcp = metrics.first_contentful_paint?.percentiles?.p75;
    const ttfb = metrics.experimental_time_to_first_byte?.percentiles?.p75;

    // Validate metrics are within reasonable ranges (ms for timing, 0-1 for CLS)
    if (!isValidMetric(lcp, 0, 30000)) return null;
    if (!isValidMetric(inp, 0, 30000)) return null;
    if (!isValidMetric(cls, 0, 1)) return null;

    // Sample size: convert density to actual count
    const densities = record.metrics.largest_contentful_paint?.histogram || [];
    const sampleSize = densities.reduce((sum: number, h: any) => sum + (h.density || 0), 0);

    const confidence = sampleSize > 0.5 ? 'high' : sampleSize > 0.1 ? 'medium' : 'low';

    return {
      lcp_ms: lcp,
      inp_ms: inp,
      cls,
      fcp_ms: fcp,
      ttfb_ms: ttfb,
      status: getCwvStatus(lcp, inp, cls),
      sampleSize: Math.floor(sampleSize * 100000),
      confidence,
    };
  } catch (error) {
    console.error('Error extracting CrUX metrics:', error);
    return null;
  }
}

/**
 * Safe extraction of PSI/Lighthouse API response with validation
 */
export function extractLighthouseMetrics(data: any): Partial<LabData> | null {
  try {
    const lighthouse = data?.lighthouseResult;
    if (!lighthouse?.categories) return null;

    const performance = lighthouse.categories.performance?.score ?? 0;
    const accessibility = lighthouse.categories.accessibility?.score ?? 0;
    const bestPractices = lighthouse.categories['best-practices']?.score ?? 0;
    const seo = lighthouse.categories.seo?.score ?? 0;

    // Validate scores are 0-1 (Lighthouse returns 0-1, multiply by 100 for display)
    if (!isValidMetric(performance, 0, 1)) return null;

    const lcp = lighthouse.audits?.['largest-contentful-paint']?.numericValue;
    const inp = lighthouse.audits?.['interaction-to-next-paint']?.numericValue;
    const cls = lighthouse.audits?.['cumulative-layout-shift']?.numericValue;

    return {
      lighthouse: {
        performance: Math.round(performance * 100),
        accessibility: Math.round(accessibility * 100),
        bestPractices: Math.round(bestPractices * 100),
        seo: Math.round(seo * 100),
      },
      cwv: {
        lcp_ms: lcp,
        inp_ms: inp,
        cls,
        status: getCwvStatus(lcp, inp, cls),
      },
    };
  } catch (error) {
    console.error('Error extracting Lighthouse metrics:', error);
    return null;
  }
}
