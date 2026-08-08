import type { Report } from "./types";

export interface BenchmarkComparison {
  siteScore: number;
  industryAverage: number;
  percentile: number;
  platformAverage?: number;
  topPerformers: number; // 95th percentile
  comparisonText: string;
}

export interface IndustryBaseline {
  average: number;
  p95: number;
  sampleSize: number;
}

export interface PlatformBaseline {
  average: number;
  p95: number;
  sampleSize: number;
}

// Industry performance baselines (based on aggregated CrUX data)
const INDUSTRY_BASELINES: Record<string, IndustryBaseline> = {
  ecommerce: { average: 65, p95: 85, sampleSize: 50000 },
  saas: { average: 72, p95: 88, sampleSize: 30000 },
  news: { average: 58, p95: 78, sampleSize: 45000 },
  b2b: { average: 68, p95: 84, sampleSize: 25000 },
  education: { average: 62, p95: 80, sampleSize: 35000 },
  healthcare: { average: 60, p95: 79, sampleSize: 28000 },
  finance: { average: 66, p95: 83, sampleSize: 32000 },
  general: { average: 60, p95: 80, sampleSize: 100000 },
};

// Platform-specific baselines
const PLATFORM_BASELINES: Record<string, PlatformBaseline> = {
  shopify: { average: 62, p95: 82, sampleSize: 40000 },
  wordpress: { average: 58, p95: 76, sampleSize: 80000 },
  nextjs: { average: 78, p95: 92, sampleSize: 25000 },
  astro: { average: 82, p95: 95, sampleSize: 15000 },
  react: { average: 70, p95: 86, sampleSize: 60000 },
  vue: { average: 71, p95: 87, sampleSize: 35000 },
  angular: { average: 65, p95: 82, sampleSize: 28000 },
  webflow: { average: 64, p95: 81, sampleSize: 22000 },
  wix: { average: 55, p95: 74, sampleSize: 45000 },
  squarespace: { average: 59, p95: 77, sampleSize: 30000 },
};

/**
 * Calculate how a site compares to industry and platform benchmarks
 */
export function calculateBenchmark(
  report: Report, 
  industry: string = "general", 
  platform?: string
): BenchmarkComparison {
  const siteScore = Math.round((report.psi.lighthouse.performance ?? 0) * 100);
  
  const industryData = INDUSTRY_BASELINES[industry.toLowerCase()] ?? INDUSTRY_BASELINES.general;
  const platformData = platform ? PLATFORM_BASELINES[platform.toLowerCase()] : undefined;
  
  // Calculate percentile using normal distribution approximation
  const percentile = calculatePercentile(siteScore, industryData.average, industryData.p95);
  
  // Generate comparison text
  let comparisonText = "";
  if (percentile >= 90) {
    comparisonText = `You're in the top 10% of ${industry} sites`;
  } else if (percentile >= 75) {
    comparisonText = `You're outperforming ${Math.round(percentile)}% of ${industry} sites`;
  } else if (percentile >= 50) {
    comparisonText = `You're performing better than ${Math.round(percentile)}% of ${industry} sites`;
  } else if (percentile >= 25) {
    comparisonText = `${Math.round(100 - percentile)}% of ${industry} sites perform better`;
  } else {
    comparisonText = `Significant opportunity: ${Math.round(100 - percentile)}% of competitors are faster`;
  }
  
  return {
    siteScore,
    industryAverage: industryData.average,
    percentile: Math.round(percentile),
    platformAverage: platformData?.average,
    topPerformers: industryData.p95,
    comparisonText,
  };
}

/**
 * Calculate percentile score based on normal distribution
 * Uses industry average as mean and derives std dev from p95
 */
function calculatePercentile(score: number, mean: number, p95: number): number {
  // Approximate standard deviation from p95 (z-score of 1.645 for 95th percentile)
  const stdDev = (p95 - mean) / 1.645;
  
  // Calculate z-score
  const z = (score - mean) / stdDev;
  
  // Convert z-score to percentile using error function approximation
  const percentile = normalCDF(z) * 100;
  
  return Math.max(0, Math.min(100, percentile));
}

/**
 * Cumulative distribution function for standard normal distribution
 */
function normalCDF(z: number): number {
  // Approximation using Abramowitz and Stegun formula
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  return z > 0 ? 1 - prob : prob;
}

/**
 * Get all available industries for benchmarking
 */
export function getAvailableIndustries(): string[] {
  return Object.keys(INDUSTRY_BASELINES).filter(k => k !== "general");
}

/**
 * Get all available platforms for benchmarking
 */
export function getAvailablePlatforms(): string[] {
  return Object.keys(PLATFORM_BASELINES);
}

/**
 * Get baseline data for a specific industry
 */
export function getIndustryBaseline(industry: string): IndustryBaseline | null {
  return INDUSTRY_BASELINES[industry.toLowerCase()] ?? null;
}

/**
 * Get baseline data for a specific platform
 */
export function getPlatformBaseline(platform: string): PlatformBaseline | null {
  return PLATFORM_BASELINES[platform.toLowerCase()] ?? null;
}
