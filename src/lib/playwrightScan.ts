/**
 * PLAYWRIGHT SCAN ENGINE
 * 
 * Browser-based performance scanning using Playwright.
 * Now enabled for local development and dedicated workers.
 */

import type { Device } from "./types";
import { env } from "./env";

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
  // Dynamically import Playwright to avoid bundling issues in serverless environments
  let playwright;
  try {
    playwright = await import("playwright");
  } catch (e) {
    console.warn("Playwright not installed. Install with: npm install playwright");
    return getDefaultResult();
  }

  const executablePath = env.CHROME_EXECUTABLE_PATH();
  
  let browser;
  try {
    const options: any = {};
    if (executablePath) {
      options.executablePath = executablePath;
    }
    
    browser = await playwright.chromium.launch(options);
    const context = await browser.newContext({
      viewport: device === "mobile" ? { width: 375, height: 667 } : { width: 1280, height: 720 },
      userAgent: device === "mobile" 
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();
    const resourceMetrics: any = { total: 0, html: 0, js: 0, css: 0, image: 0, font: 0, other: 0 };
    let requests = { total: 0, thirdParty: 0 };

    // Track network requests
    page.on("response", (response) => {
      requests.total++;
      const responseUrl = response.url();
      if (!responseUrl.startsWith("http")) return;
      
      try {
        const urlObj = new URL(responseUrl);
        const currentUrl = new URL(url);
        if (urlObj.hostname !== currentUrl.hostname) {
          requests.thirdParty++;
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });

    // Navigate with timeout
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    
    // Extract Core Web Vitals using JavaScript
    const metrics = await page.evaluate(() => {
      const navTiming = performance.getEntriesByType("navigation")[0] as any;
      const paintEntries = performance.getEntriesByType("paint");
      const largestPaint = performance.getEntriesByType("largest-contentful-paint").pop() as any;
      
      const fcp = paintEntries.find((e: any) => e.name === "first-contentful-paint")?.startTime;
      const lcp = largestPaint?.renderTime || largestPaint?.loadTime;
      
      // Estimate CLS (simplified)
      let cls = 0;
      const layoutShifts = performance.getEntriesByType("layout-shift") as any[];
      for (const shift of layoutShifts) {
        if (!shift.hadRecentInput) {
          cls += shift.value;
        }
      }

      return {
        ttfb: navTiming?.responseStart - navTiming?.fetchStart,
        fcp,
        lcp,
        cls,
        domContentLoaded: navTiming?.domContentLoadedEventEnd - navTiming?.fetchStart,
        loadComplete: navTiming?.loadEventEnd - navTiming?.fetchStart,
      };
    }).catch(() => ({}));

    // Get resource breakdown
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType("resource").map((r: any) => ({
        name: r.name,
        initiatorType: r.initiatorType,
        transferSize: r.transferSize || 0,
        decodedBodySize: r.decodedBodySize || 0,
      }));
    }).catch(() => []);

    for (const resource of resources) {
      const size = resource.transferSize || resource.decodedBodySize;
      resourceMetrics.total += size;
      
      if (resource.initiatorType === "script") {
        resourceMetrics.js += size;
      } else if (resource.initiatorType === "link" && resource.name.includes(".css")) {
        resourceMetrics.css += size;
      } else if (resource.initiatorType === "img" || resource.name.includes(/.jpg|.png|.webp/i)) {
        resourceMetrics.image += size;
      } else if (resource.name.includes(/.woff|.woff2|.ttf/i)) {
        resourceMetrics.font += size;
      } else if (resource.initiatorType === "xmlhttprequest" || resource.initiatorType === "fetch") {
        resourceMetrics.other += size;
      }
    }

    // HTML size (rough estimate)
    resourceMetrics.html = (await page.content()).length;

    await browser.close();

    return {
      timings: {
        ttfb_ms: metrics.ttfb ? Math.round(metrics.ttfb) : undefined,
        fcp_ms: metrics.fcp ? Math.round(metrics.fcp) : undefined,
        lcp_ms: metrics.lcp ? Math.round(metrics.lcp) : undefined,
        cls: metrics.cls ? Math.round(metrics.cls * 100) / 100 : undefined,
      },
      bytes: resourceMetrics,
      requests,
      hints: {
        renderBlocking: (resourceMetrics.js || 0) > 100000,
        cachePolicyLooksBad: false, // Would need to check response headers
        imageOptimizationLikelyNeeded: (resourceMetrics.image || 0) > 500000,
      },
    };
  } catch (error) {
    console.error("Playwright scan error:", error);
    return getDefaultResult();
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export function computePseudoLighthouseScores(m: PlaywrightScanResult["timings"]) {
  const lcp = m.lcp_ms || 0;
  const cls = m.cls || 0;
  const fcp = m.fcp_ms || 0;

  // Simple scoring logic (0-100)
  const lcpScore = Math.max(0, 100 - (lcp / 25));
  const clsScore = Math.max(0, 100 - (cls * 100));
  const fcpScore = Math.max(0, 100 - (fcp / 20));

  return {
    performance: Math.round((lcpScore + clsScore + fcpScore) / 3),
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
  };
}

function getDefaultResult(): PlaywrightScanResult {
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
