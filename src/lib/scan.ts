import type { Report, ScanRequest } from "./types";
import { crawlSite } from "./crawl";
import { fetchPsi } from "./psi";
import { runChecks } from "./checks";
import { computeScore } from "./scoring";
import { generateInsights } from "./insights";
import { getHost } from "./validate";

export async function runScan(id: string, input: ScanRequest, writeTokenHash: string): Promise<Report> {
  const normalizedUrl = new URL(input.url);
  const crawlEnabled = input.crawl?.enabled ?? false;
  const maxLinks = crawlEnabled ? Math.max(1, Math.min(5, input.crawl?.maxLinks ?? 1)) : 1;

  const { scannedUrls, failures } = crawlEnabled
    ? await crawlSite(normalizedUrl, maxLinks)
    : { scannedUrls: [normalizedUrl.toString()], failures: [] };

  const primaryUrl = scannedUrls[0];
  const psi = await fetchPsi(primaryUrl, input.device);
  const checks = await runChecks(primaryUrl);
  const insights = generateInsights(psi);
  const { score, grade } = computeScore(psi);

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
    manage: {
      writeTokenHash,
    },
  };
}
