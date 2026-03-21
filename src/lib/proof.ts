import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeSeo } from "./seoAnalyzer";

type ChartDatum = {
  label: string;
  score: number;
};

type BenchmarkRow = {
  metric: string;
  current: string;
  benchmark: string;
  target: string;
};

type KeyMetric = {
  label: string;
  value: string;
};

export type ProofDataset = {
  cwvScores: ChartDatum[];
  lighthouse: ChartDatum[];
  issues: Array<{ label: string; impact: number }>;
  benchmarks: BenchmarkRow[];
  calculator: {
    monthlyVisitors: number;
    conversionRate: number;
    averageOrderValue: number;
    improvementPct: number;
  };
  caseStudy: {
    beforeScore: number;
    afterScore: number;
    beforeLcpMs: number;
    afterLcpMs: number;
    upliftPct: number;
  };
  keyMetrics: KeyMetric[];
};

type ProblemEntry = {
  slug: string;
  keyword: string;
  h1: string;
  metaDescription: string;
  platform: string;
  industry: string;
  issueTitle: string;
  primaryCause: string;
  quickWins: string[];
  detailedAnalysis: string[];
  statistics: Array<{ value: string; label: string }>;
};

type PlatformEntry = {
  platform: string;
  keyword: string;
  topIssues: string[];
  avgLoadTime: string;
  commonSolutions: string[];
};

type IndustryEntry = {
  industry: string;
  keyword: string;
  avgConversionLoss: string;
  conversionImpact: string;
  stats: Array<{ value: string; label: string }>;
};

type ReportSnapshot = {
  url: string;
  canonicalHost: string;
  score100?: number;
  lighthouse: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  cwv: {
    lcp_ms?: number;
    inp_ms?: number;
    cls?: number;
  };
  insights: Array<{
    title?: string;
    severity?: string;
    impact?: string;
    category?: string;
  }>;
};

type ReportAggregate = {
  cwvScores: ChartDatum[];
  lighthouse: ChartDatum[];
  issues: Array<{ label: string; impact: number }>;
  beforeScore: number;
  beforeLcpMs: number;
  inpMs: number;
  cls: number;
};

const REPORTS_FILE = resolve(process.cwd(), ".data/reports.json");
const STOP_TOKENS = new Set([
  "why",
  "is",
  "my",
  "site",
  "website",
  "slow",
  "due",
  "for",
  "with",
  "and",
  "the",
  "your",
  "this",
  "that",
]);

const INDUSTRY_TRAFFIC: Record<string, number> = {
  ecommerce: 65000,
  saas: 28000,
  news: 120000,
  healthcare: 35000,
  finance: 42000,
  education: 38000,
  "real-estate": 31000,
  travel: 54000,
  restaurant: 26000,
};

const INDUSTRY_AOV: Record<string, number> = {
  ecommerce: 92,
  saas: 149,
  news: 18,
  healthcare: 210,
  finance: 170,
  education: 120,
  "real-estate": 380,
  travel: 260,
  restaurant: 48,
};

const INDUSTRY_CR: Record<string, number> = {
  ecommerce: 2.3,
  saas: 2.1,
  news: 1.2,
  healthcare: 2.0,
  finance: 1.7,
  education: 1.8,
  "real-estate": 2.4,
  travel: 1.6,
  restaurant: 2.9,
};

let cachedReports: ReportSnapshot[] | null = null;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
};

const avg = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, item) => sum + item, 0) / values.length : Number.NaN;

const firstNumber = (value: string) => {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : Number.NaN;
};

const parseSecondsToMs = (value: string) => {
  const parsed = firstNumber(value);
  if (Number.isNaN(parsed)) return Number.NaN;
  return value.includes("ms") ? parsed : parsed * 1000;
};

const parsePercentRange = (value: string, fallback = 1.8) => {
  const matches = value.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return fallback;
  const values = matches.map((part) => Number.parseFloat(part));
  const average = values.reduce((acc, n) => acc + n, 0) / values.length;
  return Number.isFinite(average) ? average : fallback;
};

const lcpScore = (lcpMs: number) => {
  if (lcpMs <= 2500) return 95;
  if (lcpMs <= 3200) return 80;
  if (lcpMs <= 4000) return 60;
  return 40;
};

const inpScore = (inpMs: number) => {
  if (inpMs <= 200) return 95;
  if (inpMs <= 300) return 78;
  if (inpMs <= 500) return 55;
  return 35;
};

const clsScore = (cls: number) => {
  if (cls <= 0.1) return 95;
  if (cls <= 0.2) return 72;
  if (cls <= 0.3) return 52;
  return 35;
};

const tokenize = (value: string | undefined | null) => {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_TOKENS.has(token));
};

const reportText = (report: ReportSnapshot) => {
  const insightText = report.insights
    .map((insight) => `${insight.title ?? ""} ${insight.category ?? ""}`)
    .join(" ");
  return `${report.url} ${report.canonicalHost} ${insightText}`.toLowerCase();
};

const getReports = (): ReportSnapshot[] => {
  if (cachedReports) return cachedReports;
  if (!existsSync(REPORTS_FILE)) {
    cachedReports = [];
    return cachedReports;
  }

  try {
    const raw = readFileSync(REPORTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, any>;
    const reports: ReportSnapshot[] = [];

    for (const value of Object.values(parsed)) {
      const report = value?.report;
      if (!report) continue;
      if (value?.status && value.status !== "done") continue;
      reports.push({
        url: String(report.url ?? ""),
        canonicalHost: String(report.canonicalHost ?? ""),
        score100: typeof report.summary?.score100 === "number" ? report.summary.score100 : undefined,
        lighthouse: {
          performance: report.psi?.lighthouse?.performance,
          accessibility: report.psi?.lighthouse?.accessibility,
          bestPractices: report.psi?.lighthouse?.bestPractices,
          seo: report.psi?.lighthouse?.seo,
        },
        cwv: {
          lcp_ms: report.psi?.cwv?.lcp_ms,
          inp_ms: report.psi?.cwv?.inp_ms,
          cls: report.psi?.cwv?.cls,
        },
        insights: Array.isArray(report.insights)
          ? report.insights.map((insight: any) => ({
              title: insight?.title,
              severity: insight?.severity,
              impact: insight?.impact,
              category: insight?.category,
            }))
          : [],
      });
    }

    cachedReports = reports;
    return reports;
  } catch {
    cachedReports = [];
    return cachedReports;
  }
};

const aggregateReports = (reports: ReportSnapshot[]): ReportAggregate | null => {
  if (reports.length === 0) return null;

  const lcpMs = avg(reports.map((item) => item.cwv.lcp_ms ?? Number.NaN).filter(Number.isFinite));
  const inpMs = avg(reports.map((item) => item.cwv.inp_ms ?? Number.NaN).filter(Number.isFinite));
  const cls = avg(reports.map((item) => item.cwv.cls ?? Number.NaN).filter(Number.isFinite));
  const score100 = avg(reports.map((item) => item.score100 ?? Number.NaN).filter(Number.isFinite));

  const performance = avg(
    reports.map((item) =>
      typeof item.lighthouse.performance === "number" ? item.lighthouse.performance * 100 : Number.NaN
    ).filter(Number.isFinite)
  );
  const accessibility = avg(
    reports.map((item) =>
      typeof item.lighthouse.accessibility === "number" ? item.lighthouse.accessibility * 100 : Number.NaN
    ).filter(Number.isFinite)
  );
  const bestPractices = avg(
    reports.map((item) =>
      typeof item.lighthouse.bestPractices === "number" ? item.lighthouse.bestPractices * 100 : Number.NaN
    ).filter(Number.isFinite)
  );
  const seo = avg(
    reports.map((item) =>
      typeof item.lighthouse.seo === "number" ? item.lighthouse.seo * 100 : Number.NaN
    ).filter(Number.isFinite)
  );

  const issueWeights = new Map<string, number>();
  for (const report of reports) {
    for (const insight of report.insights) {
      const title = insight.title?.trim();
      if (!title) continue;
      const severityWeight =
        insight.severity === "critical" ? 4 : insight.severity === "high" ? 3 : insight.severity === "medium" ? 2 : 1;
      const impactWeight = insight.impact === "high" ? 3 : insight.impact === "medium" ? 2 : 1;
      issueWeights.set(title, (issueWeights.get(title) ?? 0) + severityWeight + impactWeight);
    }
  }

  const topIssues = [...issueWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, weight]) => ({
      label,
      impact: clamp(weight * 7, 35, 98),
    }));

  const resolvedLcpMs = Number.isFinite(lcpMs) ? Math.round(lcpMs) : 3400;
  const resolvedInpMs = Number.isFinite(inpMs) ? Math.round(inpMs) : 280;
  const resolvedCls = Number.isFinite(cls) ? Number(cls.toFixed(2)) : 0.17;
  const resolvedScore = Number.isFinite(score100) ? Math.round(score100) : 68;

  return {
    cwvScores: [
      { label: "LCP", score: lcpScore(resolvedLcpMs) },
      { label: "INP", score: inpScore(resolvedInpMs) },
      { label: "CLS", score: clsScore(resolvedCls) },
    ],
    lighthouse: [
      { label: "Performance", score: Number.isFinite(performance) ? Math.round(performance) : 62 },
      { label: "Accessibility", score: Number.isFinite(accessibility) ? Math.round(accessibility) : 82 },
      { label: "Best Practices", score: Number.isFinite(bestPractices) ? Math.round(bestPractices) : 77 },
      { label: "SEO", score: Number.isFinite(seo) ? Math.round(seo) : 81 },
    ],
    issues: topIssues.length > 0 ? topIssues : [{ label: "Render-blocking resources", impact: 74 }],
    beforeScore: resolvedScore,
    beforeLcpMs: resolvedLcpMs,
    inpMs: resolvedInpMs,
    cls: resolvedCls,
  };
};

const getAggregateForTopic = (topicParts: string[]): ReportAggregate | null => {
  const allReports = getReports();
  if (allReports.length === 0) return null;

  const tokens = [...new Set(topicParts.flatMap((part) => tokenize(part)))];
  if (tokens.length === 0) return aggregateReports(allReports);

  const matched = allReports.filter((report) => {
    const text = reportText(report);
    let score = 0;
    for (const token of tokens) {
      if (text.includes(token)) score += 1;
    }
    return score > 0;
  });

  return aggregateReports(matched.length > 0 ? matched : allReports);
};

const buildAnalyzerFallback = ({
  title,
  description,
  keyword,
  sections,
}: {
  title: string;
  description: string;
  keyword: string;
  sections: string[];
}) => {
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <link rel="canonical" href="https://www.whyismywebsiteslow.com/" />
      </head>
      <body>
        <h1>${title}</h1>
        ${sections.map((section) => `<h2>${section}</h2><p>${section}</p>`).join("")}
      </body>
    </html>
  `;
  return analyzeSeo(html, keyword);
};

const buildCommonDataset = ({
  slug,
  industry,
  issues,
  beforeLcpMs,
  improvementPct,
  keyMetrics,
  fallbackTitle,
  fallbackDescription,
  fallbackKeyword,
  fallbackSections,
  topicParts,
}: {
  slug: string;
  industry: string;
  issues: string[];
  beforeLcpMs: number;
  improvementPct: number;
  keyMetrics: KeyMetric[];
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackKeyword: string;
  fallbackSections: string[];
  topicParts: string[];
}): ProofDataset => {
  const hash = hashString(slug);
  const reportAggregate = getAggregateForTopic(topicParts);
  const seoFallback = buildAnalyzerFallback({
    title: fallbackTitle,
    description: fallbackDescription,
    keyword: fallbackKeyword,
    sections: fallbackSections,
  });

  const reportDriven = reportAggregate;
  const baselineLcpMs = reportDriven ? reportDriven.beforeLcpMs : beforeLcpMs;
  const resolvedImprovement = clamp(Math.round(improvementPct), 8, 36);
  const beforeScore = reportDriven
    ? reportDriven.beforeScore
    : clamp(Math.round(100 - (baselineLcpMs - 1200) / 38) - (hash % 8), 35, 86);
  const afterScore = clamp(beforeScore + Math.max(8, resolvedImprovement), 45, 98);
  const afterLcpMs = Math.round(baselineLcpMs * (1 - resolvedImprovement / 100));

  const inpMs = reportDriven ? reportDriven.inpMs : 190 + (hash % 180);
  const cls = reportDriven ? reportDriven.cls : 0.08 + (hash % 14) / 100;
  const conversionRate = INDUSTRY_CR[industry] ?? 2;
  const monthlyVisitors = INDUSTRY_TRAFFIC[industry] ?? 30000;
  const averageOrderValue = INDUSTRY_AOV[industry] ?? 110;

  const fallbackIssues = seoFallback.recommendations.slice(0, 3).map((rec) => rec.issue);
  const issueLabels = reportDriven
    ? reportDriven.issues
    : (issues.length > 0 ? issues : fallbackIssues).slice(0, 3).map((label, index) => ({
        label,
        impact: clamp(84 - index * 14 - (hash % 5), 35, 90),
      }));

  const lighthouse = reportDriven
    ? reportDriven.lighthouse
    : [
        { label: "Performance", score: beforeScore },
        { label: "Accessibility", score: clamp(76 + (hash % 16), 60, 96) },
        { label: "Best Practices", score: clamp(72 + (hash % 18), 58, 95) },
        { label: "SEO", score: clamp(seoFallback.score, 45, 98) },
      ];

  const cwvScores = reportDriven
    ? reportDriven.cwvScores
    : [
        { label: "LCP", score: lcpScore(baselineLcpMs) },
        { label: "INP", score: inpScore(inpMs) },
        { label: "CLS", score: clsScore(cls) },
      ];

  const enrichedMetrics = reportDriven
    ? [
        { label: "Average LCP", value: `${(baselineLcpMs / 1000).toFixed(1)}s` },
        ...keyMetrics.slice(0, 2),
      ]
    : keyMetrics.slice(0, 3);

  return {
    cwvScores,
    lighthouse,
    issues: issueLabels,
    benchmarks: [
      {
        metric: "Largest Contentful Paint",
        current: `${(baselineLcpMs / 1000).toFixed(1)}s`,
        benchmark: "2.9s",
        target: "<=2.5s",
      },
      {
        metric: "Interaction to Next Paint",
        current: `${inpMs}ms`,
        benchmark: "280ms",
        target: "<=200ms",
      },
      {
        metric: "Cumulative Layout Shift",
        current: cls.toFixed(2),
        benchmark: "0.18",
        target: "<=0.10",
      },
      {
        metric: "Projected conversion lift",
        current: `+${resolvedImprovement}%`,
        benchmark: "+8%",
        target: ">=12%",
      },
    ],
    calculator: {
      monthlyVisitors,
      conversionRate,
      averageOrderValue,
      improvementPct: resolvedImprovement,
    },
    caseStudy: {
      beforeScore,
      afterScore,
      beforeLcpMs: baselineLcpMs,
      afterLcpMs,
      upliftPct: resolvedImprovement,
    },
    keyMetrics: enrichedMetrics,
  };
};

export const buildProblemProofDataset = (entry: ProblemEntry): ProofDataset => {
  const primaryMetric = entry.statistics[0];
  const metricMs = primaryMetric ? parseSecondsToMs(primaryMetric.value) : Number.NaN;
  const beforeLcpMs = Number.isNaN(metricMs) ? 3400 : clamp(Math.round(metricMs + 1400), 2200, 5200);
  const improvementPct = primaryMetric?.value.includes("%")
    ? clamp(firstNumber(primaryMetric.value), 8, 40)
    : 18;

  return buildCommonDataset({
    slug: entry.slug,
    industry: entry.industry,
    issues: entry.quickWins,
    beforeLcpMs,
    improvementPct,
    keyMetrics: entry.statistics.slice(0, 3).map((stat) => ({ label: stat.label, value: stat.value })),
    fallbackTitle: entry.h1,
    fallbackDescription: entry.metaDescription,
    fallbackKeyword: entry.keyword,
    fallbackSections: [entry.primaryCause, ...entry.detailedAnalysis, ...entry.quickWins],
    topicParts: [
      entry.slug,
      entry.platform,
      entry.industry,
      entry.keyword,
      entry.issueTitle,
      ...entry.quickWins,
      ...entry.detailedAnalysis,
    ],
  });
};

export const buildPlatformProofDataset = (
  platform: PlatformEntry,
  relatedIssues: string[]
): ProofDataset => {
  const baseLcpMs = parseSecondsToMs(platform.avgLoadTime);
  const beforeLcpMs = Number.isNaN(baseLcpMs) ? 3200 : clamp(Math.round(baseLcpMs), 2000, 5200);

  return buildCommonDataset({
    slug: `platform:${platform.platform}`,
    industry: "saas",
    issues: platform.topIssues,
    beforeLcpMs,
    improvementPct: 16,
    keyMetrics: [
      { label: "Average load time", value: platform.avgLoadTime },
      { label: "Top bottleneck", value: platform.topIssues[0] ?? "Script bloat" },
      { label: "Fix coverage", value: `${Math.max(3, relatedIssues.length)} recurring issues` },
    ],
    fallbackTitle: platform.keyword,
    fallbackDescription: `${platform.platform} speed audit baseline and benchmark data.`,
    fallbackKeyword: platform.keyword,
    fallbackSections: [...platform.topIssues, ...platform.commonSolutions],
    topicParts: [platform.platform, platform.keyword, ...platform.topIssues, ...platform.commonSolutions],
  });
};

export const buildIndustryProofDataset = (
  industry: IndustryEntry,
  relatedIssueTitles: string[]
): ProofDataset => {
  const conversionLoss = parsePercentRange(industry.avgConversionLoss, 1.2);
  const beforeLcpMs = clamp(Math.round(2600 + conversionLoss * 650), 2200, 5000);
  const statsMetrics = industry.stats.slice(0, 2).map((stat) => ({
    label: stat.label,
    value: stat.value,
  }));

  return buildCommonDataset({
    slug: `industry:${industry.industry}`,
    industry: industry.industry,
    issues: relatedIssueTitles.length > 0 ? relatedIssueTitles : [industry.conversionImpact],
    beforeLcpMs,
    improvementPct: clamp(conversionLoss * 9, 10, 28),
    keyMetrics: [
      ...statsMetrics,
      { label: "Average conversion loss", value: industry.avgConversionLoss },
    ],
    fallbackTitle: industry.keyword,
    fallbackDescription: industry.conversionImpact,
    fallbackKeyword: industry.keyword,
    fallbackSections: [industry.conversionImpact, ...industry.stats.map((stat) => stat.label)],
    topicParts: [industry.industry, industry.keyword, industry.conversionImpact, ...industry.stats.map((stat) => stat.label)],
  });
};
