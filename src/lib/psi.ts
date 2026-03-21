import type { Device } from "./types";
import { env } from "./env";

export type PsiResult = {
  source: "live" | "mock";
  message?: string;
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
  // NOTE: Playwright has been intentionally disabled for serverless stability.
  // We use Google PageSpeed Insights (PSI) API when available; otherwise we fall back to mock data.
  const strategy = device === "mobile" ? "mobile" : "desktop";
  const key = env.PSI_API_KEY() || undefined;
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  // categories: performance, accessibility, best-practices, seo
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.append("category", "accessibility");
  endpoint.searchParams.append("category", "best-practices");
  endpoint.searchParams.append("category", "seo");
  if (key) endpoint.searchParams.set("key", key);

  try {
    const res = await fetch(endpoint.toString(), {
      headers: { "User-Agent": "whyismywebsiteslow/1.0" },
    });
    if (!res.ok) {
      throw new Error(`PSI HTTP ${res.status}`);
    }

    const data: any = await res.json();
    const lr = data?.lighthouseResult;
    const categories = lr?.categories ?? {};
    const audits = lr?.audits ?? {};

    // CWV numeric values are typically in milliseconds except CLS.
    const lcp = audits?.["largest-contentful-paint"]?.numericValue;
    const inp = audits?.["interactive"]?.numericValue; // PSI doesn't expose INP reliably; interactive is a fallback
    const cls = audits?.["cumulative-layout-shift"]?.numericValue;
    const fcp = audits?.["first-contentful-paint"]?.numericValue;
    const ttfb = audits?.["server-response-time"]?.numericValue;

    const status =
      (typeof lcp === "number" ? lcp <= 2500 : true) &&
      (typeof cls === "number" ? cls <= 0.1 : true)
        ? "pass"
        : "fail";

    // Helpful audits
    const unusedJsBytes = audits?.["unused-javascript"]?.details?.overallSavingsBytes;
    const unusedCssBytes = audits?.["unused-css-rules"]?.details?.overallSavingsBytes;
    const totalByteWeight = audits?.["total-byte-weight"]?.numericValue;
    const renderBlocking = audits?.["render-blocking-resources"]?.score === 0;
    const imageOptimization = audits?.["uses-optimized-images"]?.score === 0;
    const cachePolicy = audits?.["uses-long-cache-ttl"]?.score === 0;

    return {
      source: "live",
      message: key
        ? "Google PageSpeed Insights scan"
        : "Google PageSpeed Insights scan (no API key; rate-limited)",
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
  } catch (err: any) {
    return {
      ...mockPsi(),
      message: `PSI scan failed; using mock data (${err?.message ?? "unknown"})`,
    };
  }
}

function mockPsi(): PsiResult {
  return {
    source: "mock",
    message: "Mock scan data",
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
