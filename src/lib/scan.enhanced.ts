import type { EnhancedReport, ScanRequest } from "./types";
import { crawlSite } from "./crawl";
import { runEnhancedScanner } from "./scanner/enhanced";
import { runChecks } from "./checks";
import { computeScore } from "./scoring";
import { generateInsights } from "./insights";
import { getHost } from "./validate";
import { computeKScore } from "./kscore";
import { analyzeSeo } from "./seoAnalyzer";
import { auditImages } from "./imageAudit";
import { sanitizeHtml } from "./sanitize";
import { fetchWithRetry } from "./retry";
import { buildBusinessImpact, buildRecommendationSummary, detectStack } from "./reportIntelligence";

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

  // Run crawl and fetch HTML in parallel when crawl is enabled
  const crawlPromise = crawlEnabled
    ? crawlSite(normalizedUrl, maxLinks)
    : Promise.resolve({ scannedUrls: [normalizedUrl.toString()], failures: [] });

  const primaryUrl = crawlEnabled
    ? await crawlPromise.then((result) => result.scannedUrls[0])
    : normalizedUrl.toString();

  const includeSeoAnalysis = options.includeSeoAnalysis ?? input.includeSeoAnalysis ?? true;
  const includeImageAudit = options.includeImageAudit ?? input.includeImageAudit ?? true;

  let html: string | null = null;
  let response: Response | null = null;

  // Fetch HTML with retry and timeout
  try {
    response = await fetchWithRetry(
      primaryUrl,
      {
        headers: { "User-Agent": "WMSSBot/0.1" },
      },
      {
        maxRetries: 2,
        timeout: 15000, // 15 seconds per attempt
        baseDelay: 1000, // 1 second initial delay
      }
    );
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

  // Run all independent scans in parallel for better performance
  // CrUX + PSI + network checks can all happen simultaneously
  const [enhancedScan, checks, crawlResult] = await Promise.all([
    runEnhancedScanner(primaryUrl, input.device),
    runChecks(primaryUrl, html !== null && response ? { html, response } : undefined),
    crawlPromise,
  ]);

  const psi = enhancedScan.lab;

  // Store enhanced data in psi for backward compatibility
  // Add real-user metrics and overall score to psi object
  (psi as any).source = enhancedScan.sources.rumAvailable ? "live" : "partial";
  (psi as any).message = enhancedScan.sources.message;
  psi.rum = enhancedScan.rum;
  psi.network = enhancedScan.network;
  psi.overallScore = enhancedScan.overallScore;
  psi.grade = enhancedScan.grade;
  psi.sources = enhancedScan.sources;

  const insights = generateInsights(psi, checks);
  const { score, grade } = computeScore(psi);

  // Run SEO and image audits in parallel if needed
  const [seoAnalysis, imageAudit] = await Promise.all([
    includeSeoAnalysis && html !== null
      ? analyzeSeo(html, options.targetKeyword ?? input.targetKeyword)
      : Promise.resolve(undefined),
    includeImageAudit && html !== null ? auditImages(html, primaryUrl) : Promise.resolve(undefined),
  ]);

  const kscore = computeKScore(psi, checks, seoAnalysis);
  const detectedStack = detectStack({ html, headers: response?.headers ?? null });

  const enhancedSummary = buildEnhancedSummary({ kscore, insights, seoAnalysis, imageAudit });
  const businessImpact = buildBusinessImpact({
    canonicalHost: getHost(normalizedUrl),
    summary: {
      grade,
      score100: score,
      topIssues: insights.slice(0, 3).map((item) => item.title),
    },
    psi,
    checks,
    insights,
  });
  const recommendationSummary = buildRecommendationSummary({
    insights,
    summary: {
      grade,
      score100: score,
      topIssues: insights.slice(0, 3).map((item) => item.title),
    },
  });

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
      scannedUrls: crawlResult.scannedUrls,
      failures: crawlResult.failures,
    },
    psi,
    checks,
    insights,
    summary: {
      grade,
      score100: score,
      topIssues: insights.slice(0, 3).map((item) => item.title),
    },
    businessImpact,
    detectedStack,
    recommendationSummary,
    kscore,
    seoAnalysis,
    imageAudit,
    enhancedSummary,
    manage: {
      writeTokenHash,
    },
  };
}
