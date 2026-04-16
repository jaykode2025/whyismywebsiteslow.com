import type { KScoreResult } from "./kscore";
import type { SeoAnalysisResult } from "./seoAnalyzer";
import type { ImageAuditResult } from "./imageAudit";

export type Device = "mobile" | "desktop";
export type Visibility = "unlisted" | "public";

export type ScanRequest = {
  url: string;
  device: Device;
  crawl?: { enabled: boolean; maxLinks: number };
  visibility?: Visibility;
  targetKeyword?: string;
  includeSeoAnalysis?: boolean;
  includeImageAudit?: boolean;
};

export type StoredScanRequest = {
  url: string;
  device: Device;
  crawl: { enabled: boolean; maxLinks: number };
  visibility: Visibility;
};

export type BusinessImpact = {
  riskLevel: "low" | "medium" | "high";
  headline: string;
  bullets: string[];
  estimatedRange: {
    conversionLiftPct: string;
    leadRecoveryPct: string;
    revenueProtection: string;
  };
};

export type DetectedStack = {
  frameworkGuess: string | null;
  cmsGuess: string | null;
  hostingGuess: string | null;
  confidence: "low" | "medium" | "high";
};

export type RecommendationSummary = {
  quickWins: string[];
  highestLeverageFixes: string[];
  nextBestAction: "unlock-report" | "start-monitoring" | "request-service";
};

export type ReportBenchmark = {
  cohort: string;
  sampleSize: number;
  percentile?: number;
  median?: number;
  comparisonText: string;
};

export type ProjectHealthSummary = {
  projectId: string;
  latestScore: number | null;
  previousScore: number | null;
  scoreDelta: number | null;
  latestCwvStatus: "pass" | "fail" | "unknown" | null;
  previousCwvStatus: "pass" | "fail" | "unknown" | null;
  trend: "improving" | "stable" | "regressed" | "unknown";
  lastScannedAt: string | null;
};

export type RegressionSummary = {
  projectId: string;
  projectUrl: string;
  previousScore: number | null;
  currentScore: number | null;
  previousCwvStatus: "pass" | "fail" | "unknown" | null;
  currentCwvStatus: "pass" | "fail" | "unknown" | null;
  summary: string;
};

export type Report = {
  id: string;
  createdAt: string;
  url: string;
  canonicalHost: string;
  device: Device;
  visibility: Visibility;
  crawl: {
    enabled: boolean;
    maxLinks: number;
    scannedUrls: string[];
    failures: { url: string; reason: string }[];
  };
  psi: {
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
    // Enhanced scanner fields (optional, for backward compatibility)
    rum?: {
      lcp_ms: number;
      inp_ms: number;
      cls: number;
      fcp_ms: number;
      ttfb_ms: number;
      status: "pass" | "fail" | "warning";
      sampleSize: number;
      confidence: "high" | "medium" | "low";
    };
    network?: {
      ttfb_ms?: number;
      dns_ms?: number;
      tls_ms?: number;
      redirect_count?: number;
      redirect_time_ms?: number;
      total_requests?: number;
      total_size_bytes?: number;
    };
    overallScore?: number;
    grade?: "A" | "B" | "C" | "D" | "F";
    sources?: {
      rumAvailable: boolean;
      labAvailable: boolean;
      networkAvailable: boolean;
    };
  };
  checks: {
    headers: {
      compression: "br" | "gzip" | "none";
      cacheControl: "good" | "ok" | "bad";
      cdn: "detected" | "unknown";
      httpVersion: "h3" | "h2" | "h1" | "unknown";
    };
    page: {
      htmlKb?: number;
      jsKb?: number;
      cssKb?: number;
      imageKb?: number;
      requestCount?: number;
    };
    hasMetaDescription?: boolean;
    hasCanonical?: boolean;
    hasH1?: boolean;
    hasHttps?: boolean;
    hasSecurityHeaders?: boolean;
  };
  insights: Array<{
    id: string;
    title: string;
    category:
      | "core-web-vitals"
      | "javascript"
      | "css"
      | "images"
      | "server"
      | "cdn"
      | "third-party"
      | "fonts";
    severity: "critical" | "high" | "medium" | "low";
    impact: "high" | "medium" | "low";
    effort: "low" | "medium" | "high";
    whatItMeans: string;
    whyItHurts: string;
    howToFix: string[];
    verification: string[];
  }>;
  summary: {
    grade: "A" | "B" | "C" | "D" | "F";
    score100: number;
    topIssues: string[];
  };
  businessImpact: BusinessImpact;
  detectedStack: DetectedStack;
  recommendationSummary: RecommendationSummary;
  benchmarks?: ReportBenchmark[];
  kscore?: KScoreResult;
  seoAnalysis?: SeoAnalysisResult;
  imageAudit?: ImageAuditResult;
  enhancedSummary?: {
    overallScore: number;
    overallGrade: string;
    performanceScore: number;
    seoScore: number;
    accessibilityScore: number;
    contentHealthScore: number;
    topIssues: string[];
    quickWins: string[];
  };
  manage: {
    writeTokenHash: string;
  };
};

export interface EnhancedReport extends Report {
  kscore: KScoreResult;
  seoAnalysis?: SeoAnalysisResult;
  imageAudit?: ImageAuditResult;
  enhancedSummary: {
    overallScore: number;
    overallGrade: string;
    performanceScore: number;
    seoScore: number;
    accessibilityScore: number;
    contentHealthScore: number;
    topIssues: string[];
    quickWins: string[];
  };
}

export type ReportStatus = "queued" | "running" | "done" | "failed";

export type StoredReport = {
  status: ReportStatus;
  report?: Report;
  error?: string;
  request?: StoredScanRequest;
};
