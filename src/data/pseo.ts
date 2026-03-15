export const TIER1 = {
  audit: "/website-speed-audit/",
  monitoring: "/website-performance-monitoring/",
  coreWebVitals: "/core-web-vitals-optimization/",
  pricing: "/pricing/",
  contact: "/contact/",
};

type ProblemSeed = {
  platform: string;
  industry: string;
  issueSlug: string;
  issueTitle: string;
  cause: string;
  quickWins: string[];
  metricValue: string;
  metricLabel: string;
};

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
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

const PLATFORM_DOCS: Record<string, { url: string; label: string }> = {
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

const CORE_OUTBOUND_LINKS = [
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

const PROBLEM_SEEDS: ProblemSeed[] = [
  {
    platform: "wordpress",
    industry: "ecommerce",
    issueSlug: "plugin-bloat",
    issueTitle: "plugin bloat",
    cause: "Too many heavy plugins add JavaScript, CSS, and database queries that increase load time.",
    quickWins: [
      "Remove plugins that duplicate functionality",
      "Profile plugin impact with Query Monitor",
      "Replace heavy plugins with lighter alternatives"
    ],
    metricValue: "28%",
    metricLabel: "average load-time reduction after plugin cleanup"
  },
  {
    platform: "wordpress",
    industry: "news",
    issueSlug: "render-blocking-assets",
    issueTitle: "render-blocking assets",
    cause: "Critical CSS and synchronous scripts block first render and delay Largest Contentful Paint.",
    quickWins: [
      "Inline critical CSS for above-the-fold content",
      "Defer non-critical JavaScript",
      "Minify and split large style bundles"
    ],
    metricValue: "1.3s",
    metricLabel: "common LCP improvement after removing render blockers"
  },
  {
    platform: "wordpress",
    industry: "saas",
    issueSlug: "slow-ttfb",
    issueTitle: "slow server response time",
    cause: "Uncached dynamic requests and slow hosting increase Time to First Byte across key pages.",
    quickWins: [
      "Enable full-page caching for public pages",
      "Use persistent object caching with Redis",
      "Move to a higher-performance hosting tier"
    ],
    metricValue: "42%",
    metricLabel: "drop in TTFB after cache and hosting improvements"
  },
  {
    platform: "shopify",
    industry: "ecommerce",
    issueSlug: "app-script-overload",
    issueTitle: "app script overload",
    cause: "Too many storefront apps inject scripts that compete on the main thread and delay interaction.",
    quickWins: [
      "Remove unused tracking or upsell apps",
      "Audit third-party script impact in Lighthouse",
      "Load non-critical app scripts after interaction"
    ],
    metricValue: "23%",
    metricLabel: "improvement in interaction metrics after script pruning"
  },
  {
    platform: "shopify",
    industry: "ecommerce",
    issueSlug: "oversized-product-images",
    issueTitle: "oversized product images",
    cause: "Large product media increases transfer weight and slows both mobile and desktop category pages.",
    quickWins: [
      "Serve modern image formats like WebP",
      "Use responsive image sizes in templates",
      "Lazy-load below-the-fold product thumbnails"
    ],
    metricValue: "35%",
    metricLabel: "median bytes saved with modern image formats"
  },
  {
    platform: "shopify",
    industry: "ecommerce",
    issueSlug: "theme-code-bloat",
    issueTitle: "theme code bloat",
    cause: "Legacy theme snippets and unused sections create unnecessary CSS and JavaScript payloads.",
    quickWins: [
      "Remove unused sections and snippets",
      "Split theme JavaScript by template",
      "Eliminate duplicated CSS across app embeds"
    ],
    metricValue: "19%",
    metricLabel: "typical reduction in JavaScript payload after theme cleanup"
  },
  {
    platform: "wix",
    industry: "restaurant",
    issueSlug: "widget-overload",
    issueTitle: "widget overload",
    cause: "Multiple embedded widgets increase script execution and delay visual stability on key pages.",
    quickWins: [
      "Keep only high-value widgets on landing pages",
      "Move optional widgets to secondary pages",
      "Prioritize static content above interactive embeds"
    ],
    metricValue: "31%",
    metricLabel: "faster first contentful paint after widget reduction"
  },
  {
    platform: "wix",
    industry: "real-estate",
    issueSlug: "autoplay-media",
    issueTitle: "autoplay media backgrounds",
    cause: "Autoplay videos and heavy background media consume bandwidth and hurt mobile responsiveness.",
    quickWins: [
      "Replace autoplay backgrounds with optimized still images",
      "Enable click-to-play for large media",
      "Compress hero media for mobile breakpoints"
    ],
    metricValue: "2.1s",
    metricLabel: "common mobile speed gain after removing autoplay hero media"
  },
  {
    platform: "drupal",
    industry: "finance",
    issueSlug: "uncached-views",
    issueTitle: "uncached dynamic views",
    cause: "Dynamic view rendering without proper cache strategy creates expensive repeated requests.",
    quickWins: [
      "Enable render and page cache for anonymous traffic",
      "Tune cache tags and cache contexts",
      "Limit expensive view relationships"
    ],
    metricValue: "37%",
    metricLabel: "average response-time reduction after view caching"
  },
  {
    platform: "drupal",
    industry: "education",
    issueSlug: "expensive-db-queries",
    issueTitle: "expensive database queries",
    cause: "Complex queries from custom modules and views increase backend latency during peak traffic.",
    quickWins: [
      "Index high-traffic query columns",
      "Reduce heavy joins in frequently viewed pages",
      "Profile query execution time before release"
    ],
    metricValue: "44%",
    metricLabel: "query time reduction after index and view optimization"
  },
  {
    platform: "magento",
    industry: "ecommerce",
    issueSlug: "extension-conflicts",
    issueTitle: "extension conflicts",
    cause: "Overlapping extensions duplicate processing and add blocking scripts on product and checkout pages.",
    quickWins: [
      "Disable duplicate extension functionality",
      "Audit extension network requests in checkout flow",
      "Retest page speed after each extension update"
    ],
    metricValue: "21%",
    metricLabel: "average checkout speed increase after extension rationalization"
  },
  {
    platform: "magento",
    industry: "ecommerce",
    issueSlug: "slow-category-indexing",
    issueTitle: "slow category indexing",
    cause: "Delayed indexing and stale cache increase category-page response time and hurt crawl efficiency.",
    quickWins: [
      "Optimize indexer schedules and queue size",
      "Warm cache for top category pages",
      "Reduce dynamic blocks on category templates"
    ],
    metricValue: "1.7s",
    metricLabel: "average category-page speed gain after indexing improvements"
  },
  {
    platform: "react",
    industry: "saas",
    issueSlug: "large-bundles",
    issueTitle: "large JavaScript bundles",
    cause: "Oversized client bundles increase parse and execution time before users can interact with the page.",
    quickWins: [
      "Use route-level code splitting",
      "Remove unused dependencies and polyfills",
      "Analyze bundle composition before each release"
    ],
    metricValue: "29%",
    metricLabel: "bundle size reduction after dependency cleanup"
  },
  {
    platform: "react",
    industry: "saas",
    issueSlug: "data-fetch-waterfalls",
    issueTitle: "client-side data fetch waterfalls",
    cause: "Sequential API calls in the browser delay content rendering and increase interaction latency.",
    quickWins: [
      "Parallelize independent API requests",
      "Prefetch critical data for landing routes",
      "Use server rendering for primary content"
    ],
    metricValue: "33%",
    metricLabel: "faster meaningful paint after fixing waterfall requests"
  },
  {
    platform: "vue",
    industry: "saas",
    issueSlug: "hydration-overhead",
    issueTitle: "hydration overhead",
    cause: "Large hydrated component trees increase startup work and delay input responsiveness.",
    quickWins: [
      "Hydrate only interactive components",
      "Split route chunks by feature area",
      "Move static blocks to server-rendered markup"
    ],
    metricValue: "26%",
    metricLabel: "drop in main-thread work after hydration tuning"
  },
  {
    platform: "angular",
    industry: "finance",
    issueSlug: "change-detection-overwork",
    issueTitle: "change detection overwork",
    cause: "Frequent global change detection cycles consume CPU and degrade responsiveness on complex views.",
    quickWins: [
      "Use OnPush where possible",
      "Memoize expensive template computations",
      "Reduce bindings in large repeated lists"
    ],
    metricValue: "39%",
    metricLabel: "INP improvement after change detection optimization"
  },
  {
    platform: "nextjs",
    industry: "saas",
    issueSlug: "uncached-api-routes",
    issueTitle: "uncached API routes",
    cause: "API routes without cache headers trigger repeated origin work and increase navigation latency.",
    quickWins: [
      "Add route-level caching and revalidation",
      "Move static data fetching to build or ISR",
      "Cache expensive upstream API responses"
    ],
    metricValue: "46%",
    metricLabel: "TTFB reduction after API response caching"
  },
  {
    platform: "nextjs",
    industry: "travel",
    issueSlug: "oversized-hero-images",
    issueTitle: "oversized hero images",
    cause: "Large unoptimized hero assets delay first paint and hurt conversion-critical landing pages.",
    quickWins: [
      "Use responsive image widths and quality settings",
      "Prefer next-gen formats for hero media",
      "Preload only one primary hero asset"
    ],
    metricValue: "1.9s",
    metricLabel: "common LCP improvement after hero image optimization"
  },
  {
    platform: "gatsby",
    industry: "news",
    issueSlug: "plugin-pipeline-bloat",
    issueTitle: "plugin and image pipeline bloat",
    cause: "Too many build plugins and heavy transforms increase page payload and stale output risk.",
    quickWins: [
      "Remove low-value build plugins",
      "Optimize image pipeline presets",
      "Audit plugin-created scripts in page templates"
    ],
    metricValue: "24%",
    metricLabel: "decrease in generated page weight after plugin cleanup"
  },
  {
    platform: "gatsby",
    industry: "education",
    issueSlug: "stale-build-artifacts",
    issueTitle: "stale build artifacts",
    cause: "Residual cached artifacts and outdated assets can ship unnecessary code to production pages.",
    quickWins: [
      "Clean build cache on major dependency updates",
      "Verify generated chunk count each release",
      "Monitor bundle diffs in CI before deploy"
    ],
    metricValue: "17%",
    metricLabel: "smaller production bundle after artifact cleanup"
  }
];

const buildProblem = (seed: ProblemSeed) => {
  const platformName = PLATFORM_DISPLAY_NAMES[seed.platform] ?? seed.platform;
  const issueTitleForHeading = seed.issueTitle
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const platformDoc = PLATFORM_DOCS[seed.platform] ?? CORE_OUTBOUND_LINKS[0];
  const outboundLinks = [platformDoc, ...CORE_OUTBOUND_LINKS];

  return {
    slug: `why-is-my-${seed.platform}-site-slow-${seed.issueSlug}`,
    keyword: `why is my ${seed.platform} site slow ${seed.issueTitle}`,
    h1: `Why Is My ${platformName} Site Slow Due to ${issueTitleForHeading}?`,
    metaDescription: `Learn why ${platformName} websites become slow because of ${seed.issueTitle} and get practical fixes to improve Core Web Vitals and conversions.`,
    platform: seed.platform,
    industry: seed.industry,
    issueTitle: seed.issueTitle,
    primaryCause: seed.cause,
    quickWins: seed.quickWins,
    detailedAnalysis: [
      `${platformName} sites often lose speed when ${seed.cause.toLowerCase()}`,
      "This bottleneck usually hurts Core Web Vitals and creates friction before users can interact with key content.",
      "A focused performance audit helps isolate this issue and prioritize changes with the highest business impact."
    ],
    solutions: [
      {
        title: `Fix ${issueTitleForHeading} in ${platformName}`,
        description: `Use a structured workflow to remove ${seed.issueTitle} bottlenecks and improve page speed stability.`,
        steps: [
          `Benchmark current performance and isolate ${seed.issueTitle} bottlenecks`,
          "Implement targeted fixes on high-traffic templates first",
          "Re-test Core Web Vitals and track conversion lift after deployment"
        ]
      }
    ],
    faqs: [
      {
        question: `How do I confirm ${seed.issueTitle} is slowing my ${platformName} site?`,
        answer: `Run PageSpeed Insights and Lighthouse, then review diagnostics related to ${seed.issueTitle} across your highest-traffic pages.`
      },
      {
        question: `Can we fix ${seed.issueTitle} without a full redesign?`,
        answer: "Yes. Most performance gains come from focused technical changes, not a complete redesign."
      },
      {
        question: `What happens to SEO when ${seed.issueTitle} is resolved?`,
        answer: "Improved speed and better Core Web Vitals generally support stronger search visibility and lower bounce rate."
      }
    ],
    statistics: [
      { value: seed.metricValue, label: seed.metricLabel },
      { value: "53%", label: "of mobile users leave pages that feel slow" },
      { value: "1s", label: "delay can materially reduce conversion rate" }
    ],
    outboundLinks,
    conversionImpact: `Fixing ${seed.issueTitle} can improve search performance, ad efficiency, and revenue per session.`
  };
};

export const PROBLEMS = PROBLEM_SEEDS.map(buildProblem);

export const PLATFORMS = [
  {
    platform: "wordpress",
    keyword: "wordpress website speed audit",
    topIssues: ["Plugin bloat", "Slow hosting", "Render-blocking JS"],
    bestFor: ["Businesses", "Agencies"],
    avgLoadTime: "4.2s",
    commonSolutions: ["Caching plugins", "CDN", "Optimized hosting"]
  },
  {
    platform: "shopify",
    keyword: "shopify website speed audit",
    topIssues: ["App scripts", "Heavy images", "Tracking pixels"],
    bestFor: ["Ecommerce brands"],
    avgLoadTime: "3.8s",
    commonSolutions: ["Theme optimization", "App auditing", "Image compression"]
  },
  {
    platform: "wix",
    keyword: "wix website speed audit",
    topIssues: ["Limited customization", "Third-party widgets", "Bloatware"],
    bestFor: ["Small businesses"],
    avgLoadTime: "5.1s",
    commonSolutions: ["Template optimization", "Widget reduction", "Proper hosting"]
  },
  {
    platform: "drupal",
    keyword: "drupal website speed audit",
    topIssues: ["Module bloat", "Database queries", "Uncached views"],
    bestFor: ["Enterprise websites"],
    avgLoadTime: "3.9s",
    commonSolutions: ["Caching strategies", "Database optimization", "CDN"]
  },
  {
    platform: "magento",
    keyword: "magento website speed audit",
    topIssues: ["Complex architecture", "Database queries", "Extension bloat"],
    bestFor: ["Ecommerce"],
    avgLoadTime: "4.5s",
    commonSolutions: ["Database optimization", "Caching", "Code optimization"]
  },
  {
    platform: "react",
    keyword: "react website speed audit",
    topIssues: ["Bundle size", "Client-side rendering", "Unused dependencies"],
    bestFor: ["SPAs"],
    avgLoadTime: "3.2s",
    commonSolutions: ["Code splitting", "SSR", "Tree shaking"]
  },
  {
    platform: "vue",
    keyword: "vue website speed audit",
    topIssues: ["Bundle size", "Client-side rendering", "State management"],
    bestFor: ["SPAs"],
    avgLoadTime: "3.0s",
    commonSolutions: ["Lazy loading", "SSR", "Optimization"]
  },
  {
    platform: "angular",
    keyword: "angular website speed audit",
    topIssues: ["Large bundle size", "Change detection", "Initial load"],
    bestFor: ["Enterprise"],
    avgLoadTime: "4.1s",
    commonSolutions: ["Lazy loading", "SSR", "Optimization"]
  },
  {
    platform: "nextjs",
    keyword: "nextjs website speed audit",
    topIssues: ["Serverless function latency", "Bundle size", "Image optimization"],
    bestFor: ["Modern web apps"],
    avgLoadTime: "2.8s",
    commonSolutions: ["SSR optimization", "Image optimization", "CDN"]
  },
  {
    platform: "gatsby",
    keyword: "gatsby website speed audit",
    topIssues: ["Build time", "Plugin conflicts", "Image optimization"],
    bestFor: ["Marketing sites"],
    avgLoadTime: "2.5s",
    commonSolutions: ["Plugin optimization", "Image optimization", "CDN"]
  }
];

export const INDUSTRIES = [
  {
    industry: "ecommerce",
    keyword: "website speed audit for ecommerce",
    conversionImpact: "Faster load improves conversion rate and SEO.",
    commonStack: ["shopify", "wordpress"],
    avgConversionLoss: "0.5-1.2%",
    stats: [
      { value: "0.1s", label: "faster load time = 8% conversion increase" },
      { value: "3s", label: "threshold for abandonment = 53% of users" }
    ]
  },
  {
    industry: "saas",
    keyword: "website speed audit for saas",
    conversionImpact: "Improved performance increases trial signup rates.",
    commonStack: ["custom", "wordpress"],
    avgConversionLoss: "0.3-0.8%",
    stats: [
      { value: "1s", label: "slower = 11% fewer page views" },
      { value: "2s", label: "threshold = 50% of users expect load time" }
    ]
  },
  {
    industry: "news",
    keyword: "website speed audit for news sites",
    conversionImpact: "Faster sites retain readers and increase ad revenue.",
    commonStack: ["wordpress", "custom cms"],
    avgConversionLoss: "0.7-1.5%",
    stats: [
      { value: "40%", label: "of users expect load under 2s" },
      { value: "73%", label: "of mobile users say site speed impacts experience" }
    ]
  },
  {
    industry: "healthcare",
    keyword: "website speed audit for healthcare",
    conversionImpact: "Faster sites improve patient acquisition and trust.",
    commonStack: ["wordpress", "custom"],
    avgConversionLoss: "0.4-1.0%",
    stats: [
      { value: "73%", label: "of patients research doctors online" },
      { value: "2s", label: "load time threshold for healthcare sites" }
    ]
  },
  {
    industry: "finance",
    keyword: "website speed audit for financial services",
    conversionImpact: "Improved performance increases trust and conversion rates.",
    commonStack: ["custom", "wordpress"],
    avgConversionLoss: "0.6-1.3%",
    stats: [
      { value: "1s", label: "delay = 10% drop in conversions" },
      { value: "67%", label: "of financial firms have slow sites" }
    ]
  },
  {
    industry: "education",
    keyword: "website speed audit for educational institutions",
    conversionImpact: "Faster sites improve enrollment and engagement.",
    commonStack: ["wordpress", "custom"],
    avgConversionLoss: "0.3-0.9%",
    stats: [
      { value: "45%", label: "increase in applications with faster sites" },
      { value: "3s", label: "threshold for student engagement" }
    ]
  },
  {
    industry: "real-estate",
    keyword: "website speed audit for real estate",
    conversionImpact: "Improved performance increases lead generation.",
    commonStack: ["wordpress", "custom"],
    avgConversionLoss: "0.5-1.1%",
    stats: [
      { value: "78%", label: "of buyers start search online" },
      { value: "2.5s", label: "optimal load time for real estate sites" }
    ]
  },
  {
    industry: "travel",
    keyword: "website speed audit for travel agencies",
    conversionImpact: "Faster sites increase booking rates and customer satisfaction.",
    commonStack: ["custom", "wordpress"],
    avgConversionLoss: "0.8-1.4%",
    stats: [
      { value: "1s", label: "delay = 11% fewer page views" },
      { value: "53%", label: "of travelers abandon slow booking sites" }
    ]
  },
  {
    industry: "restaurant",
    keyword: "website speed audit for restaurants",
    conversionImpact: "Improved performance increases online orders and reservations.",
    commonStack: ["wix", "custom"],
    avgConversionLoss: "0.4-0.9%",
    stats: [
      { value: "87%", label: "of diners research restaurants online" },
      { value: "3s", label: "load time threshold for food sites" }
    ]
  }
];

export const LOCATIONS = [
  {
    location: "north-carolina",
    keyword: "website speed audit north carolina",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "67%", label: "of NC businesses have slow websites" },
      { value: "$2.3M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "california",
    keyword: "website speed audit california",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "72%", label: "of CA businesses have slow websites" },
      { value: "$8.1M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "texas",
    keyword: "website speed audit texas",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "62%", label: "of TX businesses have slow websites" },
      { value: "$5.7M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "florida",
    keyword: "website speed audit florida",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "69%", label: "of FL businesses have slow websites" },
      { value: "$6.2M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "illinois",
    keyword: "website speed audit illinois",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "65%", label: "of IL businesses have slow websites" },
      { value: "$4.8M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "washington",
    keyword: "website speed audit washington",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "61%", label: "of WA businesses have slow websites" },
      { value: "$3.9M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "georgia",
    keyword: "website speed audit georgia",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "71%", label: "of GA businesses have slow websites" },
      { value: "$5.1M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "arizona",
    keyword: "website speed audit arizona",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "68%", label: "of AZ businesses have slow websites" },
      { value: "$4.3M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "massachusetts",
    keyword: "website speed audit massachusetts",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "64%", label: "of MA businesses have slow websites" },
      { value: "$4.7M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "tennessee",
    keyword: "website speed audit tennessee",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "70%", label: "of TN businesses have slow websites" },
      { value: "$4.9M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "ohio",
    keyword: "website speed audit ohio",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "66%", label: "of OH businesses have slow websites" },
      { value: "$5.3M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "colorado",
    keyword: "website speed audit colorado",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "63%", label: "of CO businesses have slow websites" },
      { value: "$4.1M", label: "potential annual revenue lost to slow sites" }
    ]
  },
  {
    location: "michigan",
    keyword: "website speed audit michigan",
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: "68%", label: "of MI businesses have slow websites" },
      { value: "$5.0M", label: "potential annual revenue lost to slow sites" }
    ]
  }
];
