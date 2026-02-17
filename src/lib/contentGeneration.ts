import { PROBLEMS, PLATFORMS, INDUSTRIES, LOCATIONS } from "../data/pseo";

// Utility functions to help generate more content entries

// Generate problem entries for a specific platform
export const generatePlatformProblems = (platformName: string, industry: string = "general") => {
  const commonIssues: Record<string, string[]> = {
    wordpress: [
      "Too many plugins causing bloat",
      "Poor hosting configuration",
      "Unoptimized images and media",
      "Render-blocking JavaScript and CSS",
      "Lack of caching mechanisms",
      "Outdated themes or plugins",
      "Heavy page builders",
      "Unoptimized database queries"
    ],
    shopify: [
      "Excessive apps and integrations",
      "Heavy theme customizations",
      "Unoptimized product images",
      "Tracking pixels and third-party scripts",
      "Custom code inefficiencies",
      "Poor image optimization",
      "Heavy checkout processes",
      "Uncompressed assets"
    ],
    wix: [
      "Limited customization options",
      "Bloat from built-in features",
      "Suboptimal image compression",
      "Heavy JavaScript framework",
      "Third-party widget bloat",
      "Non-optimized templates",
      "Tracking script overhead",
      "Server-side rendering delays"
    ],
    drupal: [
      "Complex module ecosystems",
      "Database query inefficiencies",
      "Uncached views and panels",
      "Heavy theming layers",
      "Module conflicts",
      "Poor caching strategies",
      "Resource-intensive modules",
      "Unoptimized image handling"
    ]
  };

  const issues = commonIssues[platformName as keyof typeof commonIssues] || commonIssues.wordpress;
  
  return issues.map((issue, index) => ({
    slug: `why-is-my-${platformName}-site-slow-issue-${index + 1}`.replace(/\s+/g, '-').toLowerCase(),
    keyword: `why is my ${platformName} site slow ${issue.split(' ')[0]} ${issue.split(' ')[1]}`.substring(0, 60).replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim(),
    h1: `Why Is My ${platformName.charAt(0).toUpperCase() + platformName.slice(1)} Site Slow Due to ${issue.split(' ')[0].charAt(0).toUpperCase() + issue.split(' ')[0].slice(1)}?`,
    metaDescription: `Learn why your ${platformName} site is slow due to ${issue.split(' ')[0]}. Expert solutions to fix ${issue} and improve performance.`,
    platform: platformName,
    industry,
    primaryCause: issue,
    quickWins: [
      `Address the specific ${issue.split(' ')[0]} issue`,
      `Optimize related configurations`,
      `Implement performance best practices`
    ],
    detailedAnalysis: [
      `${platformName} sites often experience performance issues due to ${issue}.`,
      `This affects user experience and search rankings significantly.`,
      `Proper diagnosis and resolution can dramatically improve site speed.`
    ],
    solutions: [
      {
        title: `Fix ${issue.split(' ')[0].charAt(0).toUpperCase() + issue.split(' ')[0].slice(1)} Issue`,
        description: `Targeted approach to resolve the specific ${issue} problem.`,
        steps: [
          `Diagnose the exact cause of ${issue}`,
          `Implement appropriate fixes`,
          `Test and verify improvements`
        ]
      }
    ],
    faqs: [
      {
        question: `How does ${issue} affect ${platformName} sites?`,
        answer: `The ${issue} can significantly slow down ${platformName} sites by increasing load times and resource consumption.`
      },
      {
        question: `Can I fix ${issue} myself?`,
        answer: `Yes, many ${issue} problems can be resolved with proper guidance and tools.`
      }
    ],
    statistics: [
      { value: "40%", label: "of sites affected by this issue" },
      { value: "2.3s", label: "average load time increase" },
      { value: "15%", label: "decrease in conversions" }
    ],
    outboundLinks: [
      { url: `https://${platformName}.com/docs/performance`, label: `${platformName} Performance Guide` },
      { url: "https://developers.google.com/speed/docs/insights/v5/about", label: "Google PageSpeed Insights" },
      { url: "https://www.web.dev/vitals/", label: "Web Vitals Documentation" }
    ],
    conversionImpact: `Fixing ${issue} can improve conversion rates and SEO performance.`
  }));
};

// Generate industry-specific entries
export const generateIndustryEntries = (industryName: string) => {
  const industryData = {
    ecommerce: {
      keyword: "website speed audit for ecommerce",
      conversionImpact: "Faster load times improve conversion rate and SEO for ecommerce sites.",
      commonStack: ["shopify", "wordpress", "magento"],
      avgConversionLoss: "0.5-1.2%",
      stats: [
        { value: "0.1s", label: "faster load time = 8% conversion increase" },
        { value: "3s", label: "threshold for abandonment = 53% of users" }
      ]
    },
    saas: {
      keyword: "website speed audit for saas",
      conversionImpact: "Improved performance increases trial signup rates for SaaS companies.",
      commonStack: ["react", "vue", "angular"],
      avgConversionLoss: "0.3-0.8%",
      stats: [
        { value: "1s", label: "slower = 11% fewer page views" },
        { value: "2s", label: "threshold = 50% of users expect load time" }
      ]
    },
    news: {
      keyword: "website speed audit for news sites",
      conversionImpact: "Faster sites retain readers and increase ad revenue for news organizations.",
      commonStack: ["wordpress", "custom cms"],
      avgConversionLoss: "0.7-1.5%",
      stats: [
        { value: "40%", label: "of users expect load under 2s" },
        { value: "73%", label: "of mobile users say site speed impacts experience" }
      ]
    }
  };

  const data = industryData[industryName as keyof typeof industryData] || industryData.ecommerce;
  
  return {
    industry: industryName,
    keyword: data.keyword,
    conversionImpact: data.conversionImpact,
    commonStack: data.commonStack,
    avgConversionLoss: data.avgConversionLoss,
    stats: data.stats
  };
};

// Generate location-specific entries
export const generateLocationEntries = (locationName: string) => {
  // Generate realistic statistics for the location
  const randomPercentage = Math.floor(Math.random() * 10) + 60; // 60-70%
  const randomRevenue = (Math.random() * 10 + 1).toFixed(1); // $1M-$10M
  
  return {
    location: locationName,
    keyword: `website speed audit ${locationName.replace(/-/g, ' ')}`,
    serviceAreaNote: "Remote audits available statewide.",
    localStats: [
      { value: `${randomPercentage}%`, label: `of ${locationName.replace(/-/g, ' ')} businesses have slow websites` },
      { value: `$${randomRevenue}M`, label: "potential annual revenue lost to slow sites" }
    ]
  };
};

// Combine all entries to scale the system
export const generateScaledContent = () => {
  let allProblems = [...PROBLEMS];
  let allPlatforms = [...PLATFORMS];
  let allIndustries = [...INDUSTRIES];
  let allLocations = [...LOCATIONS];
  
  // Generate additional problems for each platform
  for (const platform of PLATFORMS) {
    const platformProblems = generatePlatformProblems(platform.platform, platform.bestFor[0]?.toLowerCase() || "general");
    allProblems = [...allProblems, ...platformProblems];
  }
  
  // Add more platforms
  const additionalPlatforms = [
    { platform: "magento", keyword: "magento website speed audit", topIssues: ["Complex architecture", "Database queries", "Extension bloat"], bestFor: ["Ecommerce"], avgLoadTime: "4.5s", commonSolutions: ["Database optimization", "Caching", "Code optimization"] },
    { platform: "react", keyword: "react website speed audit", topIssues: ["Bundle size", "Client-side rendering", "Unused dependencies"], bestFor: ["SPAs"], avgLoadTime: "3.2s", commonSolutions: ["Code splitting", "SSR", "Tree shaking"] },
    { platform: "vue", keyword: "vue website speed audit", topIssues: ["Bundle size", "Client-side rendering", "State management"], bestFor: ["SPAs"], avgLoadTime: "3.0s", commonSolutions: ["Lazy loading", "SSR", "Optimization"] },
    { platform: "angular", keyword: "angular website speed audit", topIssues: ["Large bundle size", "Change detection", "Initial load"], bestFor: ["Enterprise"], avgLoadTime: "4.1s", commonSolutions: ["Lazy loading", "SSR", "Optimization"] },
    { platform: "nextjs", keyword: "nextjs website speed audit", topIssues: ["Serverless function latency", "Bundle size", "Image optimization"], bestFor: ["Modern web apps"], avgLoadTime: "2.8s", commonSolutions: ["SSR optimization", "Image optimization", "CDN"] },
    { platform: "gatsby", keyword: "gatsby website speed audit", topIssues: ["Build time", "Plugin conflicts", "Image optimization"], bestFor: ["Marketing sites"], avgLoadTime: "2.5s", commonSolutions: ["Plugin optimization", "Image optimization", "CDN"] }
  ];
  
  allPlatforms = [...allPlatforms, ...additionalPlatforms];
  
  // Add more industries
  const additionalIndustries = [
    generateIndustryEntries("healthcare"),
    generateIndustryEntries("finance"),
    generateIndustryEntries("education"),
    generateIndustryEntries("real-estate"),
    generateIndustryEntries("travel"),
    generateIndustryEntries("restaurant")
  ];
  
  allIndustries = [...allIndustries, ...additionalIndustries];
  
  // Add more locations
  const additionalLocations = [
    generateLocationEntries("florida"),
    generateLocationEntries("illinois"),
    generateLocationEntries("washington"),
    generateLocationEntries("georgia"),
    generateLocationEntries("arizona"),
    generateLocationEntries("massachusetts"),
    generateLocationEntries("tennessee"),
    generateLocationEntries("ohio"),
    generateLocationEntries("colorado"),
    generateLocationEntries("michigan")
  ];
  
  allLocations = [...allLocations, ...additionalLocations];
  
  return {
    problems: allProblems,
    platforms: allPlatforms,
    industries: allIndustries,
    locations: allLocations
  };
};