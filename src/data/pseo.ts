export const TIER1 = {
  audit: "/website-speed-audit/",
  monitoring: "/website-performance-monitoring/",
  coreWebVitals: "/core-web-vitals-optimization/",
  pricing: "/pricing/",
  contact: "/contact/",
};

export const PROBLEMS = [
  {
    slug: "why-is-my-wordpress-site-slow",
    keyword: "why is my wordpress site slow",
    platform: "wordpress",
    industry: "ecommerce",
    primaryCause: "Plugin bloat, render-blocking scripts, and slow TTFB.",
    quickWins: [
      "Remove unused plugins",
      "Defer non-critical JS",
      "Fix server caching"
    ]
  }
];

export const PLATFORMS = [
  {
    platform: "wordpress",
    keyword: "wordpress website speed audit",
    topIssues: ["Plugin bloat", "Slow hosting", "Render-blocking JS"],
    bestFor: ["Businesses", "Agencies"]
  },
  {
    platform: "shopify",
    keyword: "shopify website speed audit",
    topIssues: ["App scripts", "Heavy images", "Tracking pixels"],
    bestFor: ["Ecommerce brands"]
  }
];

export const INDUSTRIES = [
  {
    industry: "ecommerce",
    keyword: "website speed audit for ecommerce",
    conversionImpact: "Faster load improves conversion rate and SEO.",
    commonStack: ["shopify", "wordpress"]
  }
];

export const LOCATIONS = [
  {
    location: "north-carolina",
    keyword: "website speed audit north carolina",
    serviceAreaNote: "Remote audits available statewide."
  }
];
