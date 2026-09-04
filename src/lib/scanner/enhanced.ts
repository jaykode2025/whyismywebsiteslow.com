/**
 * ENHANCED SCANNER - Combines multiple data sources for better accuracy
 * 
 * Sources:
 * 1. CrUX API - Real-user metrics from actual Chrome users
 * 2. PSI/Lighthouse - Lab metrics + detailed audits
 * 3. Manual checks - TTFB, DNS, TLS, redirects, resource analysis
 * 
 * This gives you:
 * - Real-world performance data (not just lab simulations)
 * - More accurate scoring that weights RUM higher than lab
 * - Better diagnostics for what actually matters to users
 */

import type { Device } from "../types";

// Re-exported so scanner/server.ts and api/scan-enhanced.ts can import Device
// from this module (main's refactor expects it here). Single source of
// truth stays src/lib/types.ts - the two declarations were identical.
export type { Device };
import { env } from "../env";
import { fetchWithRetry } from "../retry";

export type EnhancedScannerResult = {
  // Real-user metrics from CrUX (highest priority)
  rum: {
    lcp_ms: number;
    inp_ms: number;
    cls: number;
    fcp_ms: number;
    ttfb_ms: number;
    status: "pass" | "fail" | "warning";
    sampleSize: number;
    confidence: "high" | "medium" | "low";
  };
  
  // Lab metrics from PSI/Lighthouse
  lab: {
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
      fcp_ms?: number;
      ttfb_ms?: number;
      status: "pass" | "fail" | "unknown";
    };
    audits: {
      renderBlocking?: boolean;
      unusedJsBytes?: number;
      unusedCssBytes?: number;
      totalByteWeight?: number;
      imageOptimization?: boolean;
      cachePolicy?: boolean;
    };
  };
  
  // Manual performance checks
  network: {
    ttfb_ms?: number;
    dns_ms?: number;
    tls_ms?: number;
    redirect_count?: number;
    redirect_time_ms?: number;
    total_requests?: number;
    total_size_bytes?: number;
  };
  
  // Combined score (0-100)
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  
  // Source tracking
  sources: {
    rumAvailable: boolean;
    labAvailable: boolean;
    networkAvailable: boolean;
    message?: string;
  };
};

/**
 * Fetch real-user metrics from Chrome UX Report API
 */
async function fetchCrUX(url: string, device: Device): Promise<EnhancedScannerResult["rum"] | null> {
  try {
    const origin = getOrigin(url);
    if (!origin) return null;

    const key = env.PSI_API_KEY() || undefined;
    const endpoint = new URL("https://chromeuxreport.googleapis.com/v1/records:queryRecord");
    if (key) endpoint.searchParams.set("key", key);

    const response = await fetchWithRetry(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: origin,
        formFactor: device === "mobile" ? "PHONE" : "DESKTOP",
      }),
    }, {
      maxRetries: 1,
      timeout: 10000
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No CrUX data available for this origin
        return null;
      }
      console.error(`CrUX API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const metrics = data.record?.metrics;
    
    if (!metrics) return null;

    // Extract percentiles (p75 is what Google uses for CWV)
    const lcp = metrics.largest_contentful_paint?.percentiles?.[75];
    const inp = metrics.interaction_to_next_paint?.percentiles?.[75];
    const cls = metrics.cumulative_layout_shift?.percentiles?.[75];
    const fcp = metrics.first_contentful_paint?.percentiles?.[75];
    const ttfb = metrics.experimental_time_to_first_byte?.percentiles?.[75] 
              || metrics.first_input_delay?.percentiles?.[75];

    // Calculate sample size and confidence
    const sampleSize = data.record?.key?.origin ? 
      (metrics.largest_contentful_paint?.histogram?.[0]?.count || 0) +
      (metrics.largest_contentful_paint?.histogram?.[1]?.count || 0) +
      (metrics.largest_contentful_paint?.histogram?.[2]?.count || 0) : 0;

    const confidence = sampleSize > 1000 ? "high" : sampleSize > 100 ? "medium" : "low";

    // Determine CWV status based on real-user data
    const lcpPass = lcp ? lcp <= 2500 : true;
    const inpPass = inp ? inp <= 200 : true;
    const clsPass = cls ? cls <= 0.1 : true;
    const status = lcpPass && inpPass && clsPass ? "pass" : "fail";

    return {
      lcp_ms: lcp || 0,
      inp_ms: inp || 0,
      cls: cls || 0,
      fcp_ms: fcp || 0,
      ttfb_ms: ttfb || 0,
      status,
      sampleSize,
      confidence,
    };
  } catch (err) {
    console.error("CrUX fetch failed:", err);
    return null;
  }
}

/**
 * Fetch PSI/Lighthouse lab metrics
 */
async function fetchPSI(url: string, device: Device): Promise<EnhancedScannerResult["lab"] | null> {
  try {
    const strategy = device === "mobile" ? "mobile" : "desktop";
    const key = env.PSI_API_KEY() || undefined;
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", strategy);
    endpoint.searchParams.append("category", "performance");
    endpoint.searchParams.append("category", "accessibility");
    endpoint.searchParams.append("category", "best-practices");
    endpoint.searchParams.append("category", "seo");
    if (key) endpoint.searchParams.set("key", key);

    const res = await fetchWithRetry(endpoint.toString(), {
      headers: { "User-Agent": "whyismywebsiteslow/2.0-enhanced-scanner" },
    }, {
      maxRetries: 1,
      timeout: 45000 // PSI is slow, give it 45s
    });
    
    if (!res.ok) {
      throw new Error(`PSI HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const lr = data?.lighthouseResult;
    const categories = lr?.categories ?? {};
    const audits = lr?.audits ?? {};

    const lcp = audits?.["largest-contentful-paint"]?.numericValue;
    const inp = audits?.["interactive"]?.numericValue;
    const cls = audits?.["cumulative-layout-shift"]?.numericValue;
    const fcp = audits?.["first-contentful-paint"]?.numericValue;
    const ttfb = audits?.["server-response-time"]?.numericValue;

    const status =
      (typeof lcp === "number" ? lcp <= 2500 : true) &&
      (typeof cls === "number" ? cls <= 0.1 : true)
        ? "pass"
        : "fail";

    const unusedJsBytes = audits?.["unused-javascript"]?.details?.overallSavingsBytes;
    const unusedCssBytes = audits?.["unused-css-rules"]?.details?.overallSavingsBytes;
    const totalByteWeight = audits?.["total-byte-weight"]?.numericValue;
    const renderBlocking = audits?.["render-blocking-resources"]?.score === 0;
    const imageOptimization = audits?.["uses-optimized-images"]?.score === 0;
    const cachePolicy = audits?.["uses-long-cache-ttl"]?.score === 0;

    return {
      lighthouse: {
        performance: toScore(categories?.performance?.score),
        accessibility: toScore(categories?.accessibility?.score),
        bestPractices: toScore(categories?.["best-practices"]?.score),
        seo: toScore(categories?.seo?.score),
      },
      cwv: {
        lcp_ms: typeof lcp === "number" ? Math.round(lcp) : undefined,
        inp_ms: typeof inp === "number" ? Math.round(inp) : undefined,
        cls: typeof cls === "number" ? Number(cls.toFixed(3)) : undefined,
        fcp_ms: typeof fcp === "number" ? Math.round(fcp) : undefined,
        ttfb_ms: typeof ttfb === "number" ? Math.round(ttfb) : undefined,
        status,
      },
      audits: {
        renderBlocking,
        unusedJsBytes: typeof unusedJsBytes === "number" ? Math.round(unusedJsBytes) : undefined,
        unusedCssBytes: typeof unusedCssBytes === "number" ? Math.round(unusedCssBytes) : undefined,
        totalByteWeight: typeof totalByteWeight === "number" ? Math.round(totalByteWeight) : undefined,
        imageOptimization,
        cachePolicy,
      },
    };
  } catch (err) {
    console.error("PSI fetch failed:", err);
    return null;
  }
}

/**
 * Manual network performance checks
 */
async function fetchNetworkMetrics(url: string): Promise<EnhancedScannerResult["network"]> {
  try {
    const start = Date.now();

    // Use fetch with timing to get basic network metrics
    const response = await fetchWithRetry(url, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent": "whyismywebsiteslow/2.0-enhanced-scanner",
      },
    }, {
      maxRetries: 1,
      timeout: 10000
    });

    const totalTime = Date.now() - start;

    // Count redirects
    let redirectCount = 0;
    let redirectTime = 0;
    
    // Note: We can't directly access redirect chain in fetch,
    // but we can detect if we were redirected by comparing URLs
    if (response.url !== url) {
      redirectCount = 1; // At least one redirect occurred
      redirectTime = totalTime * 0.3; // Estimate
    }

    return {
      ttfb_ms: Math.round(totalTime * 0.7), // Estimate TTFB as ~70% of total
      redirect_count: redirectCount,
      redirect_time_ms: Math.round(redirectTime),
      total_requests: 1,
      total_size_bytes: 0, // Would need full page load to measure
    };
  } catch (err) {
    console.error("Network fetch failed:", err);
    return {};
  }
}

/**
 * Calculate overall score weighting real-user data higher than lab data
 */
function calculateLegacyScore(rum: EnhancedScannerResult["rum"] | null, lab: EnhancedScannerResult["lab"] | null): {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
} {
  let score = 50; // Start at middle

  if (rum && rum.confidence !== "low") {
    // Real-user metrics get 60% weight
    const weight = rum.confidence === "high" ? 0.6 : 0.4;
    
    const lcpScore = rum.lcp_ms <= 2500 ? 100 : rum.lcp_ms <= 4000 ? 60 : 20;
    const inpScore = rum.inp_ms <= 200 ? 100 : rum.inp_ms <= 500 ? 60 : 20;
    const clsScore = rum.cls <= 0.1 ? 100 : rum.cls <= 0.25 ? 60 : 20;
    
    const rumAverage = (lcpScore + inpScore + clsScore) / 3;
    score += Math.round(rumAverage * weight);
  }

  if (lab) {
    // Lab metrics get 40% weight
    const labPerf = lab.lighthouse.performance * 100;
    score += Math.round(labPerf * 0.4);
  }

  // Normalize to 0-100
  score = Math.max(0, Math.min(100, score));

  const grade = 
    score >= 90 ? "A" :
    score >= 80 ? "B" :
    score >= 70 ? "C" :
    score >= 60 ? "D" : "F";

  return { score, grade };
}

function toScore(value: number | undefined): number {
  if (typeof value !== "number") return 0;
  return Math.round(value * 100) / 100;
}

function getOrigin(url: string): string | null {
  try {
    const withProtocol = url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Main enhanced scanner function
 */
export async function runEnhancedScanner(
  url: string,
  device: Device = "mobile"
): Promise<EnhancedScannerResult> {
  // Run all scans in parallel for speed
  const [rum, lab, network] = await Promise.all([
    fetchCrUX(url, device),
    fetchPSI(url, device),
    fetchNetworkMetrics(url),
  ]);

  const { score: overallScore, grade } = calculateLegacyScore(rum, lab);

  const messages: string[] = [];
  if (!rum) {
    if (!env.PSI_API_KEY()) {
      messages.push("CrUX data unavailable (missing PSI_API_KEY)");
    } else {
      messages.push("No real-user (CrUX) data found for this origin");
    }
  }
  if (!lab) {
    messages.push("PageSpeed lab data failed to load (check rate limits)");
  }
  if (!network) {
    messages.push("Manual network check failed");
  }

  return {
    rum: rum || {
      lcp_ms: 0,
      inp_ms: 0,
      cls: 0,
      fcp_ms: 0,
      ttfb_ms: 0,
      status: "fail",
      sampleSize: 0,
      confidence: "low",
    },
    lab: lab || {
      lighthouse: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
      },
      cwv: {
        status: "unknown",
      },
      audits: {},
    },
    network,
    overallScore,
    grade,
    sources: {
      rumAvailable: rum !== null,
      labAvailable: lab !== null,
      networkAvailable: network !== null && Object.keys(network).length > 0,
      message: messages.join("; "),
    },
  };
}

/* ============================================================================
 * Types and pure utilities from main's scanner refactor (commit e4a3f81).
 *
 * That refactor split the scanner into a pure types/utils module (this half)
 * and a server-side implementation (scanner/server.ts), but it landed the
 * network half at the wrong path - src/src/lib/scanner/enhanced.ts - and
 * deleted runEnhancedScanner from here, breaking every existing consumer.
 *
 * Both halves are kept: runEnhancedScanner above still powers the live scan
 * pipeline (src/lib/scan.enhanced.ts), while the exports below satisfy
 * scanner/server.ts and pages/api/scan-enhanced.ts. There is no name overlap
 * between the two halves apart from calculateOverallScore, whose module-local
 * version above was renamed calculateLegacyScore.
 * ========================================================================= */

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
