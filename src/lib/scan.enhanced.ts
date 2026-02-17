import type { EnhancedReport, ScanRequest } from "./types";
import { crawlSite } from "./crawl";
import { fetchPsi } from "./psi";
import { runChecks } from "./checks";
import { computeScore } from "./scoring";
import { generateInsights } from "./insights";
import { getHost } from "./validate";
import { computeKScore } from "./kscore";
import { analyzeSeo } from "./seoAnalyzer";
import { auditImages } from "./imageAudit";
import { sanitizeHtml } from "./sanitize";
import { fetchWithRetry } from "./retry";

type EnhancedScanOptions = {
  includeSeoAnalysis?: boolean;
  includeImageAudit?: boolean;
  targetKeyword?: string;
};

function buildEnhancedSummary(params: {
  kscore: EnhancedReport["kscore"];
  insights: EnhancedReport["insights"];
  seoAnalysis?: EnhancedReport["seoAnalysis"];
  imageAudit?: EnhancedReport["imageAudit"];
}) {
  const topIssues: string[] = [];
  const quickWins: string[] = [];

  for (const insight of params.insights) {
    if (topIssues.length < 3) topIssues.push(insight.title);
    if (insight.effort === "low" && quickWins.length < 3) quickWins.push(insight.title);
  }

  if (params.seoAnalysis) {
    for (const rec of params.seoAnalysis.recommendations) {
      if (rec.priority === "high" && topIssues.length < 3) topIssues.push(rec.issue);
      if (rec.priority !== "high" && quickWins.length < 3) quickWins.push(rec.issue);
    }
  }

  if (params.imageAudit) {
    for (const rec of params.imageAudit.recommendations) {
      if (rec.priority === "high" && topIssues.length < 3) topIssues.push(rec.issue);
      if (rec.priority !== "high" && quickWins.length < 3) quickWins.push(rec.issue);
    }
  }

  return {
    overallScore: params.kscore.overall,
    overallGrade: params.kscore.grade,
    performanceScore: params.kscore.categories.performance.score,
    seoScore: params.kscore.categories.seo.score,
    accessibilityScore: params.kscore.categories.accessibility.score,
    contentHealthScore: params.kscore.categories.content.score,
    topIssues: topIssues.slice(0, 3),
    quickWins: quickWins.slice(0, 3),
  };
}

export async function runEnhancedScan(
  id: string,
  input: ScanRequest,
  writeTokenHash: string,
  options: EnhancedScanOptions = {}
): Promise<EnhancedReport> {
  const normalizedUrl = new URL(input.url);
  const crawlEnabled = input.crawl?.enabled ?? false;
  const maxLinks = crawlEnabled ? Math.max(1, Math.min(5, input.crawl?.maxLinks ?? 1)) : 1;

  const { scannedUrls, failures } = crawlEnabled
    ? await crawlSite(normalizedUrl, maxLinks)
    : { scannedUrls: [normalizedUrl.toString()], failures: [] };

  const primaryUrl = scannedUrls[0];
  const includeSeoAnalysis = options.includeSeoAnalysis ?? input.includeSeoAnalysis ?? true;
  const includeImageAudit = options.includeImageAudit ?? input.includeImageAudit ?? true;

  let html: string | null = null;
  let response: Response | null = null;
  
  // Use fetch with retry and timeout for HTML content (serverless safe)
  try {
    response = await fetchWithRetry(primaryUrl, {
      headers: { "User-Agent": "WMSSBot/0.1" },
    }, {
      maxRetries: 2,
      timeout: 15000, // 15 seconds per attempt
      baseDelay: 1000 // 1 second initial delay
    });
    if (response.ok) {
      html = await response.text();
      // Sanitize HTML to prevent XSS
      html = sanitizeHtml(html);
    }
  } catch (e) {
    console.error(`Failed to fetch HTML for ${primaryUrl}:`, e);
    html = null;
    response = null;
  }

  // PSI is our source of truth for performance metrics
  const psi = await fetchPsi(primaryUrl, input.device);
  const checks = await runChecks(primaryUrl, html !== null && response ? { html, response } : undefined);
  const insights = generateInsights(psi, checks);
  const { score, grade } = computeScore(psi);

  const seoAnalysis =
    includeSeoAnalysis && html !== null ? analyzeSeo(html, options.targetKeyword ?? input.targetKeyword) : undefined;
  const imageAudit = includeImageAudit && html !== null ? await auditImages(html, primaryUrl) : undefined;
  const kscore = computeKScore(psi, checks, seoAnalysis);

  const enhancedSummary = buildEnhancedSummary({ kscore, insights, seoAnalysis, imageAudit });

  return {
    id,
    createdAt: new Date().toISOString(),
    url: primaryUrl,
    canonicalHost: getHost(normalizedUrl),
    device: input.device,
    visibility: input.visibility ?? "unlisted",
    crawl: {
      enabled: crawlEnabled,
      maxLinks,
      scannedUrls,
      failures,
    },
    psi,
    checks,
    insights,
    summary: {
      grade,
      score100: score,
      topIssues: insights.slice(0, 3).map((item) => item.title),
    },
    kscore,
    seoAnalysis,
    imageAudit,
    enhancedSummary,
    manage: {
      writeTokenHash,
    },
  };
}
