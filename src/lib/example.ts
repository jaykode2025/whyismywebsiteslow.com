import type { Report } from "./types";

export function exampleReport(id = "example"): Report {
  return {
    id,
    createdAt: new Date().toISOString(),
    url: "https://alpha.agency",
    canonicalHost: "alpha.agency",
    device: "mobile",
    visibility: "public",
    crawl: {
      enabled: true,
      maxLinks: 5,
      scannedUrls: [
        "https://alpha.agency",
        "https://alpha.agency/work",
        "https://alpha.agency/services",
        "https://alpha.agency/blog",
        "https://alpha.agency/contact",
      ],
      failures: [],
    },
    psi: {
      lighthouse: {
        performance: 0.93,
        accessibility: 0.96,
        bestPractices: 0.9,
        seo: 0.95,
      },
      cwv: {
        lcp_ms: 2100,
        inp_ms: 180,
        cls: 0.04,
        fcp_ms: 1500,
        ttfb_ms: 420,
        status: "pass",
      },
      audits: {
        renderBlocking: false,
        unusedJsBytes: 62000,
        unusedCssBytes: 18000,
        totalByteWeight: 2100000,
        imageOptimization: false,
        cachePolicy: false,
      },
    },
    checks: {
      headers: {
        compression: "br",
        cacheControl: "good",
        cdn: "detected",
        httpVersion: "h2",
      },
      page: {
        htmlKb: 54,
        jsKb: 420,
        cssKb: 180,
        imageKb: 1200,
        requestCount: 42,
      },
    },
    insights: [
      {
        id: "font-loading",
        title: "Font loading blocks first paint",
        category: "fonts",
        severity: "medium",
        impact: "medium",
        effort: "low",
        whatItMeans: "Font requests delay text rendering on first load.",
        whyItHurts: "Users wait longer before seeing content.",
        howToFix: ["Preload critical fonts", "Use font-display: swap"],
        verification: ["Check filmstrip timings", "Re-run PSI"],
      },
      {
        id: "third-party",
        title: "Third-party scripts add latency",
        category: "third-party",
        severity: "high",
        impact: "high",
        effort: "medium",
        whatItMeans: "External scripts block the main thread during load.",
        whyItHurts: "Delays interactivity and increases INP.",
        howToFix: ["Remove unused tags", "Load analytics after interaction"],
        verification: ["Audit JS execution", "Check INP again"],
      },
    ],
    summary: {
      grade: "A",
      score100: 94,
      topIssues: ["Third-party scripts add latency", "Font loading blocks first paint"],
    },
    manage: {
      writeTokenHash: "example",
    },
  };
}
