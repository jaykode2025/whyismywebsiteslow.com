import type { PsiResult } from "./psi";
import type { SeoAnalysisResult } from "./seoAnalyzer";
import type { Report } from "./types";

type Grade = "A" | "B" | "C" | "D" | "F";
export type KScoreCategoryStatus = "good" | "ok" | "poor";

export type KScoreCategoryResult = {
  score: number;
  weight: number;
  status: KScoreCategoryStatus;
  notes: string[];
};

export type KScoreResult = {
  overall: number;
  grade: Grade;
  categories: {
    performance: KScoreCategoryResult;
    seo: KScoreCategoryResult;
    accessibility: KScoreCategoryResult;
    content: KScoreCategoryResult;
    technical: KScoreCategoryResult;
  };
  breakdown: Array<{ key: string; score: number; weight: number; status: KScoreCategoryStatus }>;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromScore(score: number): Grade {
  return score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
}

function statusFromScore(score: number): KScoreCategoryStatus {
  return score >= 85 ? "good" : score >= 70 ? "ok" : "poor";
}

export function computeKScore(psi: PsiResult, checks?: Report["checks"], seoAnalysis?: SeoAnalysisResult): KScoreResult {
  const notes: Record<string, string[]> = {
    performance: [],
    seo: [],
    accessibility: [],
    content: [],
    technical: [],
  };

  let performanceScore = Math.round((psi.lighthouse.performance ?? 0) * 100);
  if (psi.cwv.status === "fail") {
    performanceScore -= 10;
    notes.performance.push("Core Web Vitals failing");
  }
  if (psi.cwv.ttfb_ms && psi.cwv.ttfb_ms > 800) {
    performanceScore -= 5;
    notes.performance.push("TTFB above 800ms");
  }
  if (psi.audits.totalByteWeight && psi.audits.totalByteWeight > 3_000_000) {
    performanceScore -= 5;
    notes.performance.push("Page weight above 3MB");
  }
  performanceScore = clampScore(performanceScore);

  let seoScore = Math.round((psi.lighthouse.seo ?? 0) * 100);
  if (checks) {
    if (!checks.hasMetaDescription) {
      seoScore -= 5;
      notes.seo.push("Missing meta description");
    }
    if (!checks.hasCanonical) {
      seoScore -= 5;
      notes.seo.push("Missing canonical tag");
    }
    if (!checks.hasH1) {
      seoScore -= 5;
      notes.seo.push("Missing H1");
    }
    if (checks.hasHttps === false) {
      seoScore -= 5;
      notes.seo.push("HTTPS not detected");
    }
  }
  if (seoAnalysis) {
    seoScore = clampScore(seoScore * 0.7 + seoAnalysis.score * 0.3);
  } else {
    seoScore = clampScore(seoScore);
  }

  const accessibilityScore = clampScore((psi.lighthouse.accessibility ?? 0) * 100);

  let contentScore = seoAnalysis?.score ?? 75;
  if (seoAnalysis) {
    if (seoAnalysis.content.wordCount < 300) {
      contentScore -= 5;
      notes.content.push("Content under 300 words");
    }
    if (seoAnalysis.keywordAnalysis.primaryKeyword && seoAnalysis.keywordAnalysis.density < 0.5) {
      contentScore -= 5;
      notes.content.push("Keyword used sparingly");
    }
  }
  contentScore = clampScore(contentScore);

  let technicalScore = 100;
  if (checks) {
    if (checks.headers.compression === "none") {
      technicalScore -= 10;
      notes.technical.push("Compression missing");
    }
    if (checks.headers.cacheControl === "bad") {
      technicalScore -= 10;
      notes.technical.push("Cache policy weak");
    }
    if (checks.headers.cdn === "unknown") {
      technicalScore -= 10;
      notes.technical.push("No CDN detected");
    }
    if (checks.headers.httpVersion === "h1") {
      technicalScore -= 5;
      notes.technical.push("HTTP/1.1 in use");
    }
    if (!checks.hasSecurityHeaders) {
      technicalScore -= 10;
      notes.technical.push("Security headers missing");
    }
  }
  technicalScore = clampScore(technicalScore);

  const categories = {
    performance: {
      score: performanceScore,
      weight: 0.35,
      status: statusFromScore(performanceScore),
      notes: notes.performance,
    },
    seo: {
      score: seoScore,
      weight: 0.2,
      status: statusFromScore(seoScore),
      notes: notes.seo,
    },
    accessibility: {
      score: accessibilityScore,
      weight: 0.15,
      status: statusFromScore(accessibilityScore),
      notes: notes.accessibility,
    },
    content: {
      score: contentScore,
      weight: 0.15,
      status: statusFromScore(contentScore),
      notes: notes.content,
    },
    technical: {
      score: technicalScore,
      weight: 0.15,
      status: statusFromScore(technicalScore),
      notes: notes.technical,
    },
  } as const;

  const overall = clampScore(
    categories.performance.score * categories.performance.weight +
      categories.seo.score * categories.seo.weight +
      categories.accessibility.score * categories.accessibility.weight +
      categories.content.score * categories.content.weight +
      categories.technical.score * categories.technical.weight
  );

  const breakdown = Object.entries(categories).map(([key, value]) => ({
    key,
    score: value.score,
    weight: value.weight,
    status: value.status,
  }));

  return {
    overall,
    grade: gradeFromScore(overall),
    categories,
    breakdown,
  };
}
