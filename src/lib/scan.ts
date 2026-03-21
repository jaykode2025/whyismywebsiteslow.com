import type { Report, ScanRequest } from "./types";
import { crawlSite } from "./crawl";
import { fetchPsi } from "./psi";
import { runChecks } from "./checks";
import { computeScore } from "./scoring";
import { generateInsights } from "./insights";
import { getHost } from "./validate";
import { buildBusinessImpact, buildRecommendationSummary } from "./reportIntelligence";

import { logger } from "./logger";

/**
 * Legacy/simple scan path. The app uses runEnhancedScan from scan.enhanced.ts for all scans.
 * Kept for optional simple scans or backwards compatibility.
 */
export async function runScan(id: string, input: ScanRequest, writeTokenHash: string): Promise<Report> {
  logger.scan(id, 'Starting scan', { url: input.url, device: input.device });
  
  const normalizedUrl = new URL(input.url);
  const crawlEnabled = input.crawl?.enabled ?? false;
  const maxLinks = crawlEnabled ? Math.max(1, Math.min(5, input.crawl?.maxLinks ?? 1)) : 1;

  const { scannedUrls, failures } = crawlEnabled
    ? await crawlSite(normalizedUrl, maxLinks)
    : { scannedUrls: [normalizedUrl.toString()], failures: [] };

  logger.scan(id, 'Crawl complete', { scannedUrls: scannedUrls.length, failures: failures.length });

  const primaryUrl = scannedUrls[0];
  const psi = await fetchPsi(primaryUrl, input.device);
  const checks = await runChecks(primaryUrl);
  const insights = generateInsights(psi, checks);
  const { score, grade } = computeScore(psi);

  logger.scan(id, 'Scan complete', { score, grade, insights: insights.length });

  const summary = {
    grade,
    score100: score,
    topIssues: insights.slice(0, 3).map((item) => item.title),
  } as const;

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
    summary,
    businessImpact: buildBusinessImpact({
      canonicalHost: getHost(normalizedUrl),
      summary,
      psi,
      checks,
      insights,
    }),
    detectedStack: {
      frameworkGuess: null,
      cmsGuess: null,
      hostingGuess: null,
      confidence: "low",
    },
    recommendationSummary: buildRecommendationSummary({
      insights,
      summary,
    }),
    manage: {
      writeTokenHash,
    },
  };
}
