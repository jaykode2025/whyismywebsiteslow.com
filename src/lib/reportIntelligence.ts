import type { BusinessImpact, DetectedStack, RecommendationSummary, Report } from "./types";

function containsAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function detectFramework(html: string | null, headers: Headers | null) {
  const body = normalizeText(html);
  const server = normalizeText(headers?.get("server"));
  const poweredBy = normalizeText(headers?.get("x-powered-by"));

  if (containsAny(body, ["/_astro/", 'generator" content="astro', "astro-island"])) {
    return { value: "Astro", confidence: "high" as const };
  }
  if (containsAny(body, ["/_next/", "__next"])) {
    return { value: "Next.js", confidence: "high" as const };
  }
  if (containsAny(body, ["/_nuxt/", "__nuxt"])) {
    return { value: "Nuxt", confidence: "high" as const };
  }
  if (containsAny(poweredBy, ["next.js"])) {
    return { value: "Next.js", confidence: "medium" as const };
  }
  if (containsAny(server, ["vercel"])) {
    return { value: "Likely JAMstack/SSR app", confidence: "low" as const };
  }
  return { value: null, confidence: "low" as const };
}

function detectCms(html: string | null, headers: Headers | null) {
  const body = normalizeText(html);
  const server = normalizeText(headers?.get("server"));

  if (containsAny(body, ["/wp-content/", "/wp-includes/", "wp-json", 'generator" content="wordpress'])) {
    return { value: "WordPress", confidence: "high" as const };
  }
  if (containsAny(body, ["cdn.shopify.com", "shopify-section", "shopify.theme"])) {
    return { value: "Shopify", confidence: "high" as const };
  }
  if (containsAny(body, ["static.wixstatic.com", "wix.com website builder"])) {
    return { value: "Wix", confidence: "high" as const };
  }
  if (containsAny(body, ["static.squarespace.com", "squarespace"])) {
    return { value: "Squarespace", confidence: "high" as const };
  }
  if (containsAny(body, ["webflow", "data-wf-page", "data-wf-site"])) {
    return { value: "Webflow", confidence: "high" as const };
  }
  if (containsAny(server, ["shopify"])) {
    return { value: "Shopify", confidence: "medium" as const };
  }
  return { value: null, confidence: "low" as const };
}

function detectHosting(headers: Headers | null) {
  const server = normalizeText(headers?.get("server"));
  const poweredBy = normalizeText(headers?.get("x-powered-by"));
  const via = normalizeText(headers?.get("via"));

  if (headers?.get("x-vercel-id") || containsAny(server, ["vercel"])) {
    return { value: "Vercel", confidence: "high" as const };
  }
  if (headers?.get("x-nf-request-id") || containsAny(server, ["netlify"])) {
    return { value: "Netlify", confidence: "high" as const };
  }
  if (headers?.get("cf-ray") || containsAny(server, ["cloudflare"]) || containsAny(via, ["cloudflare"])) {
    return { value: "Cloudflare", confidence: "high" as const };
  }
  if (containsAny(server, ["wp engine", "wpengine"])) {
    return { value: "WP Engine", confidence: "high" as const };
  }
  if (containsAny(poweredBy, ["express", "next.js"])) {
    return { value: "Custom app hosting", confidence: "low" as const };
  }
  return { value: null, confidence: "low" as const };
}

export function detectStack(params: { html: string | null; headers: Headers | null }): DetectedStack {
  const framework = detectFramework(params.html, params.headers);
  const cms = detectCms(params.html, params.headers);
  const hosting = detectHosting(params.headers);
  const confidenceLevels = [framework.confidence, cms.confidence, hosting.confidence];
  const confidence = confidenceLevels.includes("high")
    ? "high"
    : confidenceLevels.includes("medium")
      ? "medium"
      : "low";

  return {
    frameworkGuess: framework.value,
    cmsGuess: cms.value,
    hostingGuess: hosting.value,
    confidence,
  };
}

export function buildBusinessImpact(report: Pick<Report, "canonicalHost" | "summary" | "psi" | "checks" | "insights">): BusinessImpact {
  const score = report.summary.score100;
  const lcpMs = report.psi.cwv.lcp_ms ?? 0;
  const ttfbMs = report.psi.cwv.ttfb_ms ?? 0;
  const requestCount = report.checks.page.requestCount ?? 0;
  const highImpactIssues = report.insights.filter((item) => item.impact === "high").length;

  const riskLevel: BusinessImpact["riskLevel"] =
    score >= 90 && report.psi.cwv.status === "pass"
      ? "low"
      : score >= 70 && highImpactIssues < 2
        ? "medium"
        : "high";

  const headline =
    riskLevel === "low"
      ? "The site is not in urgent trouble, but tightening the biggest friction points should protect conversions."
      : riskLevel === "medium"
        ? "The site is leaving some trust and conversion upside on the table because the first impression is slower than it needs to be."
        : "The site is slow enough to create real revenue risk by delaying trust, interaction, and page completion.";

  const bullets = [
    lcpMs > 0
      ? `Visitors are waiting about ${(lcpMs / 1000).toFixed(1)}s to see the main content, which increases abandonment on first load.`
      : "The current scan shows meaningful delay before users see the main content.",
    ttfbMs > 800
      ? `Server response is ${Math.round(ttfbMs)} ms, so every other optimization starts from a slower baseline.`
      : "Server response is not the biggest issue, so front-end cleanup should return faster wins.",
    requestCount > 70
      ? `The page makes ${requestCount} requests, which adds coordination overhead and makes regressions easier to trigger.`
      : `The strongest business case is reducing the top ${Math.max(1, highImpactIssues)} high-impact bottlenecks before they compound.`,
  ];

  const estimatedRange =
    riskLevel === "low"
      ? {
          conversionLiftPct: "2-6%",
          leadRecoveryPct: "1-4%",
          revenueProtection: "$100-$500/mo",
        }
      : riskLevel === "medium"
        ? {
            conversionLiftPct: "6-14%",
            leadRecoveryPct: "4-9%",
            revenueProtection: "$300-$1,500/mo",
          }
        : {
            conversionLiftPct: "12-28%",
            leadRecoveryPct: "8-18%",
            revenueProtection: "$750-$4,000+/mo",
          };

  return {
    riskLevel,
    headline,
    bullets,
    estimatedRange,
  };
}

export function buildRecommendationSummary(report: Pick<Report, "insights" | "summary">): RecommendationSummary {
  const sorted = [...report.insights].sort((a, b) => {
    const impactRank = a.impact === b.impact ? 0 : a.impact === "high" ? -1 : b.impact === "high" ? 1 : a.impact === "medium" ? -1 : 1;
    if (impactRank !== 0) return impactRank;
    if (a.effort !== b.effort) return a.effort === "low" ? -1 : b.effort === "low" ? 1 : a.effort === "medium" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  const quickWins = sorted
    .filter((item) => item.effort === "low")
    .slice(0, 3)
    .map((item) => item.title);

  const highestLeverageFixes = sorted.slice(0, 3).map((item) => item.title);

  const nextBestAction: RecommendationSummary["nextBestAction"] =
    report.summary.score100 < 70
      ? "request-service"
      : report.summary.score100 >= 90
        ? "start-monitoring"
        : "unlock-report";

  return {
    quickWins,
    highestLeverageFixes,
    nextBestAction,
  };
}
