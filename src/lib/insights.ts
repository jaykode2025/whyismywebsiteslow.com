import type { Report } from "./types";

const severityRank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
const impactRank = { high: 3, medium: 2, low: 1 } as const;
const effortRank = { low: 1, medium: 2, high: 3 } as const;

export function generateInsights(psi: Report["psi"]) {
  const insights: Report["insights"] = [];

  const add = (entry: Report["insights"][number]) => insights.push(entry);

  if (psi.cwv.lcp_ms && psi.cwv.lcp_ms > 2500) {
    add({
      id: "lcp",
      title: "Largest Contentful Paint is slow",
      category: "core-web-vitals",
      severity: psi.cwv.lcp_ms > 4000 ? "critical" : "high",
      impact: "high",
      effort: "medium",
      whatItMeans: "Your main content takes too long to render, hurting perceived speed.",
      whyItHurts: "Slow LCP makes pages feel sluggish and can reduce conversions.",
      howToFix: ["Optimize hero images", "Inline critical CSS", "Reduce server response time"],
      verification: ["Re-run a PSI scan", "Check LCP in DevTools performance insights"],
    });
  }

  if (psi.cwv.inp_ms && psi.cwv.inp_ms > 200) {
    add({
      id: "inp",
      title: "Interaction to Next Paint needs work",
      category: "core-web-vitals",
      severity: psi.cwv.inp_ms > 500 ? "critical" : "high",
      impact: "high",
      effort: "high",
      whatItMeans: "Your site feels laggy when users click or tap.",
      whyItHurts: "High INP causes delayed interactions and frustration.",
      howToFix: ["Break up long JavaScript tasks", "Defer non-critical scripts", "Reduce third-party JS"],
      verification: ["Record an interaction trace", "Watch INP in Chrome UX Report"],
    });
  }

  if (psi.cwv.cls && psi.cwv.cls > 0.1) {
    add({
      id: "cls",
      title: "Layout shifts are noticeable",
      category: "core-web-vitals",
      severity: psi.cwv.cls > 0.25 ? "high" : "medium",
      impact: "medium",
      effort: "low",
      whatItMeans: "Content moves around as it loads.",
      whyItHurts: "Unexpected shifts cause mis-clicks and reduce trust.",
      howToFix: ["Reserve space for images", "Avoid injecting banners above content"],
      verification: ["Check CLS in PSI", "Audit with Web Vitals overlay"],
    });
  }

  if (psi.audits.renderBlocking) {
    add({
      id: "render-blocking",
      title: "Render-blocking resources delay first paint",
      category: "css",
      severity: "high",
      impact: "high",
      effort: "medium",
      whatItMeans: "CSS and JS are blocking the browser from painting.",
      whyItHurts: "Users wait longer before seeing anything useful.",
      howToFix: ["Inline critical CSS", "Defer non-critical scripts", "Split CSS by route"],
      verification: ["Check waterfall blocking time", "Run Lighthouse locally"],
    });
  }

  if (psi.audits.unusedJsBytes && psi.audits.unusedJsBytes > 150_000) {
    add({
      id: "unused-js",
      title: "Unused JavaScript bloat",
      category: "javascript",
      severity: "high",
      impact: "high",
      effort: "medium",
      whatItMeans: "A lot of JS downloads but never runs.",
      whyItHurts: "Extra JS slows CPU and delays interactivity.",
      howToFix: ["Remove unused libraries", "Code-split routes", "Use lighter alternatives"],
      verification: ["Check coverage in DevTools", "Re-run PSI and compare"],
    });
  }

  if (psi.audits.unusedCssBytes && psi.audits.unusedCssBytes > 50_000) {
    add({
      id: "unused-css",
      title: "Unused CSS weighs down styles",
      category: "css",
      severity: "medium",
      impact: "medium",
      effort: "low",
      whatItMeans: "Large CSS payloads are downloaded but not used.",
      whyItHurts: "Extra styles slow rendering and increase transfer size.",
      howToFix: ["Purge unused CSS", "Split CSS by page", "Use utility classes"],
      verification: ["Inspect CSS coverage", "Re-run PSI"],
    });
  }

  if (psi.audits.totalByteWeight && psi.audits.totalByteWeight > 3_000_000) {
    add({
      id: "weight",
      title: "Page weight is heavy",
      category: "images",
      severity: "high",
      impact: "high",
      effort: "medium",
      whatItMeans: "Your page ships more than 3MB of data.",
      whyItHurts: "Large payloads slow load times, especially on mobile.",
      howToFix: ["Compress images", "Serve next-gen formats", "Lazy-load below the fold"],
      verification: ["Check total byte weight in PSI", "Review network transfer size"],
    });
  }

  if (psi.audits.imageOptimization) {
    add({
      id: "images",
      title: "Images need optimization",
      category: "images",
      severity: "medium",
      impact: "medium",
      effort: "low",
      whatItMeans: "Images are larger than they need to be.",
      whyItHurts: "Unoptimized media increases LCP and bandwidth usage.",
      howToFix: ["Serve WebP/AVIF", "Resize to display dimensions"],
      verification: ["Compare image sizes", "Re-run PSI"],
    });
  }

  if (psi.audits.cachePolicy) {
    add({
      id: "cache",
      title: "Caching policy is weak",
      category: "server",
      severity: "medium",
      impact: "medium",
      effort: "low",
      whatItMeans: "Assets are not cached long enough.",
      whyItHurts: "Repeat visits still require full downloads.",
      howToFix: ["Set long cache headers for static assets", "Use immutable file names"],
      verification: ["Inspect response headers", "Run a repeat view test"],
    });
  }

  if (psi.cwv.ttfb_ms && psi.cwv.ttfb_ms > 800) {
    add({
      id: "ttfb",
      title: "Time to First Byte is high",
      category: "server",
      severity: "high",
      impact: "high",
      effort: "medium",
      whatItMeans: "Your server takes a long time to respond.",
      whyItHurts: "Slow TTFB blocks everything else from loading.",
      howToFix: ["Add caching", "Optimize database queries", "Use a CDN"],
      verification: ["Check server timings", "Re-run PSI with cold cache"],
    });
  }

  return insights.sort((a, b) => {
    const severity = severityRank[b.severity] - severityRank[a.severity];
    if (severity !== 0) return severity;
    const impact = impactRank[b.impact] - impactRank[a.impact];
    if (impact !== 0) return impact;
    return effortRank[a.effort] - effortRank[b.effort];
  });
}
