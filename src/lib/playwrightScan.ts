/**
 * PLAYWRIGHT SCAN ENGINE (DISABLED BY DEFAULT)
 * 
 * This engine is kept for future use (e.g., dedicated workers or advanced audits).
 * It is currently disabled to ensure serverless compatibility and stability.
 */

import type { Device } from "./types";

export type PlaywrightScanResult = {
  timings: {
    ttfb_ms?: number;
    fcp_ms?: number;
    lcp_ms?: number;
    cls?: number;
    inp_ms?: number;
  };
  bytes: {
    total: number;
    html: number;
    js: number;
    css: number;
    image: number;
    font: number;
    other: number;
  };
  requests: {
    total: number;
    thirdParty: number;
  };
  hints: {
    renderBlocking: boolean;
    cachePolicyLooksBad: boolean;
    imageOptimizationLikelyNeeded: boolean;
  };
};

export async function runPlaywrightScan(url: string, device: Device): Promise<PlaywrightScanResult> {
  void url;
  void device;
  console.warn("Playwright scan called but is currently disabled.");
  
  // Return empty/default results to avoid crashing if called
  return {
    timings: {},
    bytes: {
      total: 0,
      html: 0,
      js: 0,
      css: 0,
      image: 0,
      font: 0,
      other: 0,
    },
    requests: {
      total: 0,
      thirdParty: 0,
    },
    hints: {
      renderBlocking: false,
      cachePolicyLooksBad: false,
      imageOptimizationLikelyNeeded: false,
    },
  };
}

export function computePseudoLighthouseScores(m: PlaywrightScanResult["timings"]) {
  void m;
  return {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
  };
}
