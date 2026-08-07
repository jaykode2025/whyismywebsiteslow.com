/**
 * Platform configuration and documentation links
 */

export interface PlatformDoc {
  url: string;
  label: string;
}

export interface PlatformConfig {
  platform: string;
  keyword: string;
  topIssues: string[];
  bestFor: string[];
  avgLoadTime: string;
  commonSolutions: string[];
}

export const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  wix: "Wix",
  drupal: "Drupal",
  magento: "Magento",
  react: "React",
  vue: "Vue",
  angular: "Angular",
  nextjs: "Next.js",
  gatsby: "Gatsby"
};

export const PLATFORM_DOCS: Record<string, PlatformDoc> = {
  wordpress: {
    url: "https://developer.wordpress.org/advanced-administration/performance/",
    label: "WordPress Performance Handbook"
  },
  shopify: {
    url: "https://shopify.dev/docs/storefronts/themes/best-practices/performance",
    label: "Shopify Theme Performance Best Practices"
  },
  wix: {
    url: "https://support.wix.com/en/article/wix-site-performance-and-loading-times",
    label: "Wix Site Performance Guide"
  },
  drupal: {
    url: "https://www.drupal.org/docs/develop/performance",
    label: "Drupal Performance Documentation"
  },
  magento: {
    url: "https://experienceleague.adobe.com/en/docs/commerce-operations/performance-best-practices/home",
    label: "Adobe Commerce Performance Best Practices"
  },
  react: {
    url: "https://react.dev/reference/react/lazy",
    label: "React Lazy Loading"
  },
  vue: {
    url: "https://vuejs.org/guide/best-practices/performance.html",
    label: "Vue Performance Best Practices"
  },
  angular: {
    url: "https://angular.dev/best-practices/slow-computations",
    label: "Angular Performance Best Practices"
  },
  nextjs: {
    url: "https://nextjs.org/docs/app/guides/performance",
    label: "Next.js Performance Guide"
  },
  gatsby: {
    url: "https://www.gatsbyjs.com/docs/how-to/performance/improving-site-performance/",
    label: "Gatsby Performance Guide"
  }
};

export const CORE_OUTBOUND_LINKS: PlatformDoc[] = [
  {
    url: "https://developers.google.com/speed/docs/insights/v5/about",
    label: "Google PageSpeed Insights Documentation"
  },
  {
    url: "https://web.dev/articles/vitals",
    label: "Core Web Vitals on web.dev"
  },
  {
    url: "https://developer.mozilla.org/en-US/docs/Web/Performance",
    label: "MDN Web Performance Guide"
  }
];

export const PLATFORMS: PlatformConfig[] = [
  {
    "platform": "wordpress",
    "keyword": "wordpress website speed audit",
    "topIssues": [
      "Plugin bloat",
      "Slow hosting",
      "Render-blocking JS"
    ],
    "bestFor": [
      "Businesses",
      "Agencies"
    ],
    "avgLoadTime": "4.2s",
    "commonSolutions": [
      "Caching plugins",
      "CDN",
      "Optimized hosting"
    ]
  },
  {
    "platform": "shopify",
    "keyword": "shopify website speed audit",
    "topIssues": [
      "App scripts",
      "Heavy images",
      "Tracking pixels"
    ],
    "bestFor": [
      "Ecommerce brands"
    ],
    "avgLoadTime": "3.8s",
    "commonSolutions": [
      "Theme optimization",
      "App auditing",
      "Image compression"
    ]
  },
  {
    "platform": "wix",
    "keyword": "wix website speed audit",
    "topIssues": [
      "Limited customization",
      "Third-party widgets",
      "Bloatware"
    ],
    "bestFor": [
      "Small businesses"
    ],
    "avgLoadTime": "5.1s",
    "commonSolutions": [
      "Template optimization",
      "Widget reduction",
      "Proper hosting"
    ]
  },
  {
    "platform": "drupal",
    "keyword": "drupal website speed audit",
    "topIssues": [
      "Module bloat",
      "Database queries",
      "Uncached views"
    ],
    "bestFor": [
      "Enterprises",
      "Universities"
    ],
    "avgLoadTime": "4.5s",
    "commonSolutions": [
      "Varnish caching",
      "Query optimization",
      "CDN"
    ]
  },
  {
    "platform": "magento",
    "keyword": "magento website speed audit",
    "topIssues": [
      "Heavy extensions",
      "Database load",
      "Indexing issues"
    ],
    "bestFor": [
      "Mid-market ecommerce"
    ],
    "avgLoadTime": "4.8s",
    "commonSolutions": [
      "ElasticSearch",
      "Full-page caching",
      "Database optimization"
    ]
  },
  {
    "platform": "react",
    "keyword": "react website speed audit",
    "topIssues": [
      "Large bundle size",
      "Client-side rendering",
      "Unoptimized renders"
    ],
    "bestFor": [
      "Web applications"
    ],
    "avgLoadTime": "3.2s",
    "commonSolutions": [
      "Code splitting",
      "Server-side rendering",
      "Memoization"
    ]
  },
  {
    "platform": "vue",
    "keyword": "vue website speed audit",
    "topIssues": [
      "Large component trees",
      "Reactivity overhead",
      "Asset optimization"
    ],
    "bestFor": [
      "SPAs",
      "Progressive apps"
    ],
    "avgLoadTime": "3.0s",
    "commonSolutions": [
      "Lazy loading",
      "SSR/Nuxt",
      "Tree shaking"
    ]
  },
  {
    "platform": "angular",
    "keyword": "angular website speed audit",
    "topIssues": [
      "Bundle size",
      "Change detection",
      "Initial load time"
    ],
    "bestFor": [
      "Enterprise applications"
    ],
    "avgLoadTime": "3.5s",
    "commonSolutions": [
      "AOT compilation",
      "Lazy loading modules",
      "Production builds"
    ]
  },
  {
    "platform": "nextjs",
    "keyword": "nextjs website speed audit",
    "topIssues": [
      "Hydration costs",
      "API route latency",
      "Image optimization"
    ],
    "bestFor": [
      "Content sites",
      "Ecommerce"
    ],
    "avgLoadTime": "2.8s",
    "commonSolutions": [
      "Static generation",
      "Incremental static regeneration",
      "Next/Image"
    ]
  },
  {
    "platform": "gatsby",
    "keyword": "gatsby website speed audit",
    "topIssues": [
      "Build times",
      "JavaScript hydration",
      "GraphQL queries"
    ],
    "bestFor": [
      "Marketing sites",
      "Blogs"
    ],
    "avgLoadTime": "2.9s",
    "commonSolutions": [
      "Deferred hydration",
      "Query optimization",
      "Partial hydration"
    ]
  }
];

export function getPlatformDisplayName(platform: string): string {
  return PLATFORM_DISPLAY_NAMES[platform] ?? platform;
}

export function getPlatformDoc(platform: string): PlatformDoc {
  return PLATFORM_DOCS[platform] ?? CORE_OUTBOUND_LINKS[0];
}
