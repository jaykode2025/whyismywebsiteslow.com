import type { Report } from "./types";

export interface ActionableInsight {
  issueId: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  whatItMeans: string;
  whyItHurts: string;
  revenueImpact: {
    estimatedLossPerMonth: number;
    conversionImpactPercent: number;
  };
  fixComplexity: "quick-win" | "moderate" | "complex";
  codeSnippet?: string;
  estimatedTimeToFix: string;
  businessOutcome: string;
}

const INSIGHT_LIBRARY: Record<string, Omit<ActionableInsight, "issueId">> = {
  "render-blocking-css": {
    category: "Performance",
    priority: "critical",
    whatItMeans: "CSS files block page rendering until fully loaded",
    whyItHurts: "Users see a blank screen longer, leading to bounce rates up to 40% for every 1s delay",
    revenueImpact: {
      estimatedLossPerMonth: 2400,
      conversionImpactPercent: 7
    },
    fixComplexity: "quick-win",
    codeSnippet: `<!-- Async load non-critical CSS -->
<link rel="preload" href="/critical.css" as="style">
<link rel="stylesheet" href="/critical.css">
<link rel="preload" href="/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/non-critical.css"></noscript>`,
    estimatedTimeToFix: "30 minutes",
    businessOutcome: "Page renders 1-2s faster, +3-5% conversion lift typical"
  },

  "unused-javascript": {
    category: "Performance",
    priority: "high",
    whatItMeans: "Site loads 150-450KB of unused JavaScript code",
    whyItHurts: "Unused JS still gets parsed and compiled, burning CPU and battery on user devices",
    revenueImpact: {
      estimatedLossPerMonth: 1800,
      conversionImpactPercent: 4.2
    },
    fixComplexity: "moderate",
    codeSnippet: `// Use dynamic import to load JS only when needed
if (document.querySelector('[data-needs-slider]')) {
  import('./slider.js').then(({ initSlider }) => initSlider());
}`,
    estimatedTimeToFix: "2-4 hours",
    businessOutcome: "Reduce JS by 300KB, improve mobile performance by ~40%"
  },

  "image-optimization": {
    category: "Performance",
    priority: "high",
    whatItMeans: "Unoptimized images waste bandwidth and slow render",
    whyItHurts: "On 4G networks, slow image loading increases bounce by 25-30%",
    revenueImpact: {
      estimatedLossPerMonth: 3200,
      conversionImpactPercent: 6.5
    },
    fixComplexity: "quick-win",
    codeSnippet: `<!-- Modern responsive images with WebP -->
<picture>
  <source srcset="/image.webp 1x, /image-2x.webp 2x" type="image/webp">
  <img src="/image.jpg" alt="Description" loading="lazy">
</picture>`,
    estimatedTimeToFix: "1-2 hours",
    businessOutcome: "50-70% file size reduction, ~2s LCP improvement"
  },

  "slow-ttfb": {
    category: "Server",
    priority: "critical",
    whatItMeans: "Server takes too long to respond (TTFB > 600ms)",
    whyItHurts: "Every optimization is delayed by slow server response, compounding total load time",
    revenueImpact: {
      estimatedLossPerMonth: 2800,
      conversionImpactPercent: 5.8
    },
    fixComplexity: "moderate",
    codeSnippet: `// Enable caching headers
Cache-Control: public, max-age=31536000
// Use CDN edge caching
// Optimize database queries`,
    estimatedTimeToFix: "2-6 hours",
    businessOutcome: "Reduce TTFB by 300-500ms, improve all downstream metrics"
  },

  "layout-shift": {
    category: "Core Web Vitals",
    priority: "high",
    whatItMeans: "Page elements shift during loading, causing mis-clicks",
    whyItHurts: "Users frustrated by unexpected layout shifts abandon pages 15% more often",
    revenueImpact: {
      estimatedLossPerMonth: 1950,
      conversionImpactPercent: 4.8
    },
    fixComplexity: "quick-win",
    codeSnippet: `<!-- Reserve space for images/ads -->
<img src="hero.jpg" width="800" height="600" style="aspect-ratio: 4/3">
<!-- Or use aspect-ratio CSS -->
.image-container { aspect-ratio: 16/9; }`,
    estimatedTimeToFix: "1-3 hours",
    businessOutcome: "CLS below 0.1 threshold, better user experience and SEO"
  },

  "large-page-weight": {
    category: "Performance",
    priority: "medium",
    whatItMeans: "Total page weight exceeds 3MB",
    whyItHurts: "Mobile users on 4G wait 15-20s to load full page, 53% abandon after 3s",
    revenueImpact: {
      estimatedLossPerMonth: 2100,
      conversionImpactPercent: 5.2
    },
    fixComplexity: "complex",
    codeSnippet: `// Implement code splitting
import('./heavy-component').then(Module => Module.init());
// Lazy load below-fold content
const LazyComponent = lazy(() => import('./LazyComponent'));`,
    estimatedTimeToFix: "4-8 hours",
    businessOutcome: "Reduce page weight by 40-60%, faster Time to Interactive"
  }
};

export function generateActionableInsights(report: Report): ActionableInsight[] {
  const insights: ActionableInsight[] = [];
  
  // Map PSI audits to actionable insights
  if (report.psi.audits.render_blocking_resources?.score !== undefined && 
      report.psi.audits.render_blocking_resources.score < 90) {
    insights.push({
      issueId: "render-blocking-css",
      ...INSIGHT_LIBRARY["render-blocking-css"]
    });
  }
  
  if (report.psi.audits.unused_javascript?.score !== undefined && 
      report.psi.audits.unused_javascript.score < 80) {
    insights.push({
      issueId: "unused-javascript",
      ...INSIGHT_LIBRARY["unused-javascript"]
    });
  }
  
  if (report.psi.audits.uses_optimized_images?.score !== undefined && 
      report.psi.audits.uses_optimized_images.score < 85) {
    insights.push({
      issueId: "image-optimization",
      ...INSIGHT_LIBRARY["image-optimization"]
    });
  }
  
  if (report.psi.cwv.ttfb_ms && report.psi.cwv.ttfb_ms > 600) {
    insights.push({
      issueId: "slow-ttfb",
      ...INSIGHT_LIBRARY["slow-ttfb"]
    });
  }
  
  if (report.psi.cwv.cls && report.psi.cwv.cls > 0.1) {
    insights.push({
      issueId: "layout-shift",
      ...INSIGHT_LIBRARY["layout-shift"]
    });
  }
  
  if (report.psi.audits.totalByteWeight && report.psi.audits.totalByteWeight > 3_000_000) {
    insights.push({
      issueId: "large-page-weight",
      ...INSIGHT_LIBRARY["large-page-weight"]
    });
  }
  
  // Sort by revenue impact (highest first for unlock CTA)
  return insights.sort((a, b) => 
    b.revenueImpact.estimatedLossPerMonth - a.revenueImpact.estimatedLossPerMonth
  );
}

export function calculateTotalMonthlyRevenueLoss(insights: ActionableInsight[]): number {
  return insights.reduce((sum, i) => sum + i.revenueImpact.estimatedLossPerMonth, 0);
}

export function calculateTotalConversionImpact(insights: ActionableInsight[]): number {
  // Avoid double-counting: take the max individual impact + diminishing returns for others
  if (insights.length === 0) return 0;
  const sorted = [...insights].sort((a, b) => 
    b.revenueImpact.conversionImpactPercent - a.revenueImpact.conversionImpactPercent
  );
  
  let total = sorted[0].revenueImpact.conversionImpactPercent;
  for (let i = 1; i < sorted.length; i++) {
    total += sorted[i].revenueImpact.conversionImpactPercent * Math.pow(0.7, i); // Diminishing returns
  }
  
  return Math.round(total * 10) / 10;
}
