import type { Device } from "./types";

export type PsiResult = {
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

function toScore(value: number | undefined) {
  if (typeof value !== "number") return 0;
  return Math.round(value * 100) / 100;
}

export async function fetchPsi(url: string, device: Device): Promise<PsiResult> {
  const apiKey = process.env.PSI_API_KEY;
  if (!apiKey) {
    return mockPsi();
  }

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", device);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("category", "accessibility");
  endpoint.searchParams.set("category", "best-practices");
  endpoint.searchParams.set("category", "seo");
  endpoint.searchParams.set("key", apiKey);

  const res = await fetch(endpoint.toString());
  if (!res.ok) {
    return mockPsi();
  }
  const data = await res.json();
  const lighthouse = data?.lighthouseResult?.categories ?? {};
  const audits = data?.lighthouseResult?.audits ?? {};
  const loading = data?.loadingExperience ?? {};

  const cwvStatusRaw = loading?.overall_category?.toLowerCase();
  const status = cwvStatusRaw === "fast" ? "pass" : cwvStatusRaw === "slow" ? "fail" : "unknown";

  return {
    lighthouse: {
      performance: toScore(lighthouse?.performance?.score ?? 0),
      accessibility: toScore(lighthouse?.accessibility?.score ?? 0),
      bestPractices: toScore(lighthouse?.["best-practices"]?.score ?? 0),
      seo: toScore(lighthouse?.seo?.score ?? 0),
    },
    cwv: {
      lcp_ms: audits?.["largest-contentful-paint"]?.numericValue,
      inp_ms: audits?.["interaction-to-next-paint"]?.numericValue,
      cls: audits?.["cumulative-layout-shift"]?.numericValue,
      fcp_ms: audits?.["first-contentful-paint"]?.numericValue,
      ttfb_ms: audits?.["server-response-time"]?.numericValue,
      status,
    },
    audits: {
      renderBlocking: audits?.["render-blocking-resources"]?.score !== 1,
      unusedJsBytes: audits?.["unused-javascript"]?.details?.overallSavingsBytes,
      unusedCssBytes: audits?.["unused-css-rules"]?.details?.overallSavingsBytes,
      totalByteWeight: audits?.["total-byte-weight"]?.numericValue,
      imageOptimization: audits?.["uses-optimized-images"]?.score !== 1,
      cachePolicy: audits?.["uses-long-cache-ttl"]?.score !== 1,
    },
  };
}

function mockPsi(): PsiResult {
  return {
    lighthouse: {
      performance: 0.78,
      accessibility: 0.92,
      bestPractices: 0.88,
      seo: 0.9,
    },
    cwv: {
      lcp_ms: 3200,
      inp_ms: 240,
      cls: 0.12,
      fcp_ms: 2100,
      ttfb_ms: 700,
      status: "fail",
    },
    audits: {
      renderBlocking: true,
      unusedJsBytes: 220000,
      unusedCssBytes: 80000,
      totalByteWeight: 3400000,
      imageOptimization: true,
      cachePolicy: true,
    },
  };
}
