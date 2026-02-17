import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const write = (p, c) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, c.trimStart());
  console.log("✔", p.replace(ROOT, ""));
};

/* ------------------ DATA ------------------ */
write(
  "src/data/pseo.ts",
  `
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
    h1: "Why Is My WordPress Site Slow? Top Causes & Solutions",
    metaDescription: "Discover why your WordPress site is slow and learn proven solutions to speed it up. Expert tips for faster loading times and better performance.",
    platform: "wordpress",
    industry: "ecommerce",
    primaryCause: "Plugin bloat, render-blocking scripts, and slow Time to First Byte (TTFB) are the most common culprits behind slow WordPress sites.",
    quickWins: [
      "Remove unused plugins that add overhead",
      "Defer non-critical JavaScript to prevent render blocking",
      "Implement server-side caching for faster response times",
      "Optimize images and leverage browser caching",
      "Upgrade to a performance-focused hosting solution"
    ],
    detailedAnalysis: [
      "WordPress sites often suffer from performance issues due to inefficient themes, excessive plugins, and poor hosting configurations.",
      "According to Google's research, 53% of mobile users abandon pages that take longer than 3 seconds to load.",
      "A slow WordPress site can lead to decreased search rankings, lower conversion rates, and poor user experience."
    ],
    solutions: [
      {
        title: "Optimize Your Hosting",
        description: "Choose a hosting provider that specializes in WordPress optimization with SSD storage, CDN integration, and PHP 7.4+.",
        steps: [
          "Migrate to a managed WordPress host",
          "Enable server-level caching (OPcache, Redis)",
          "Use a content delivery network (CDN)"
        ]
      },
      {
        title: "Clean Up Plugins",
        description: "Every plugin adds overhead to your site. Audit and remove unnecessary plugins regularly.",
        steps: [
          "Deactivate and delete unused plugins",
          "Replace resource-heavy plugins with lighter alternatives",
          "Use built-in functions instead of plugins when possible"
        ]
      },
      {
        title: "Optimize Images",
        description: "Images typically account for 60-70% of a page's weight. Proper optimization can dramatically improve load times.",
        steps: [
          "Compress images before uploading",
          "Use next-gen formats like WebP",
          "Implement lazy loading for below-the-fold images"
        ]
      }
    ],
    faqs: [
      {
        question: "How do I know if my WordPress site is slow?",
        answer: "Use tools like Google PageSpeed Insights, GTmetrix, or our free website speed audit to measure your Core Web Vitals and overall performance score."
      },
      {
        question: "Can too many plugins slow down WordPress?",
        answer: "Yes, each plugin adds HTTP requests, JavaScript, and CSS to your site. More than 20 active plugins can significantly impact performance."
      },
      {
        question: "What is a good loading time for WordPress?",
        answer: "Ideally, your WordPress site should load in under 2 seconds. Google recommends keeping Total Blocking Time under 300ms for optimal Core Web Vitals scores."
      }
    ],
    statistics: [
      { value: "53%", label: "of mobile users abandon pages taking >3s to load" },
      { value: "1s", label: "delay can decrease conversions by up to 7%" },
      { value: "40%", label: "of visitors will leave if a page takes >3s to load" }
    ],
    outboundLinks: [
      { url: "https://developers.google.com/speed/docs/insights/v5/about", label: "Google PageSpeed Insights Documentation" },
      { url: "https://wordpress.org/support/article/common-performance-problems/", label: "WordPress Performance Guide" },
      { url: "https://www.gutenberg.com/", label: "Web Performance Best Practices" }
    ],
    conversionImpact: "Faster load times improve conversion rate and SEO ranking."
  }
];

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
  }
];
`,
);

/* ------------------ SEO HELPERS ------------------ */
write(
  "src/lib/seo.ts",
  `
export const siteUrl = (p: string) => "https://whyismywebsiteslow.com" + p;
export const titleCase = (s: string) => s.replace(/\\b\\w/g, (m: string) => m.toUpperCase());
export const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + "…" : s;
export const jsonLd = (o: any) => JSON.stringify(o);

// Enhanced breadcrumb generator with proper schema
export const breadcrumb = (items: Array<{name: string, item?: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((i, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: i.name,
    ...(i.item && { item: siteUrl(i.item) })
  }))
});

// Enhanced FAQ schema generator
export const faq = (faqs: Array<{question: string, answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(f => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.a }
  }))
});

// Article schema generator for rich snippets
export const articleSchema = (title: string, description: string, author: string, datePublished: string, dateModified: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description: description,
  author: {
    "@type": "Organization",
    name: author
  },
  publisher: {
    "@type": "Organization",
    name: "Why Is My Website Slow",
    logo: {
      "@type": "ImageObject",
      url: siteUrl("/logo.png")  // Placeholder - you'd need to add your logo
    }
  },
  datePublished: datePublished,
  dateModified: dateModified
});

// Organization schema
export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Why Is My Website Slow",
  url: siteUrl("/"),
  logo: siteUrl("/logo.png"),  // Placeholder
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-800-SPEED-AUDIT",  // Placeholder
    contactType: "customer service",
    areaServed: "US",
    availableLanguage: "en"
  }
});

// Generate keyword-rich title with proper length
export const generateTitle = (keyword: string, brand?: string) => {
  const baseTitle = \`\${keyword.charAt(0).toUpperCase() + keyword.slice(1)}\`;
  const fullTitle = brand ? \`\${baseTitle} - \${brand}\` : baseTitle;
  return fullTitle.length > 60 ? fullTitle.substring(0, 57) + "..." : fullTitle;
};

// Calculate keyword density in content
export const calculateKeywordDensity = (content: string, keyword: string): number => {
  const words = content.toLowerCase().match(/\\b(\\w+)\\b/g) || [];
  const keywordWords = keyword.toLowerCase().split(/\\s+/);
  
  let count = 0;
  for (const kw of keywordWords) {
    count += words.filter(word => word.includes(kw)).length;
  }
  
  return parseFloat(((count / words.length) * 100).toFixed(2));
};
`,
);

/* ------------------ RELATED LINKS ------------------ */
write(
  "src/lib/related.ts",
  `
import { PROBLEMS, PLATFORMS, INDUSTRIES, TIER1 } from "../data/pseo";

export const relatedForProblem = (slug: string) => {
  const p = PROBLEMS.find(x=>x.slug===slug);
  if(!p) return [];
  
  // Find related problems in the same industry
  const relatedProblemsByIndustry = PROBLEMS.filter(x => 
    x.industry === p.industry && x.slug !== slug
  ).slice(0, 2);
  
  // Find related platforms
  const relatedByPlatform = PLATFORMS.filter(platform => 
    platform.platform === p.platform
  );
  
  // Find related industries
  const relatedByIndustry = INDUSTRIES.filter(industry => 
    industry.industry === p.industry
  );
  
  return [
    {href:TIER1.audit, label:"Free Website Speed Audit"},
    {href:TIER1.coreWebVitals, label:"Core Web Vitals Optimization"},
    {href:\`/website-speed-audit/\${p.platform}\`, label:\`\${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)} Speed Audit\`},
    ...relatedProblemsByIndustry.map(x => ({href:\`/why-is-my-website-slow/\${x.slug}\`, label:x.keyword})),
    ...relatedByPlatform.slice(0, 1).map(platform => ({
      href: \`/why-is-my-\${platform.platform}-site-slow\`,
      label: platform.keyword
    })),
    ...relatedByIndustry.slice(0, 1).map(industry => ({
      href: \`/website-speed-audit/\${industry.industry}\`,
      label: industry.keyword
    })),
    {href:TIER1.monitoring, label:"Continuous Performance Monitoring"}
  ];
};
`,
);

/* ------------------ COMPONENT ------------------ */
write(
  "src/components/RelatedLinks.astro",
  `
---
type RelatedItem = {
  href: string;
  label: string;
};

const { items = [] } = Astro.props as { items?: RelatedItem[] };
---
<section>
  <h2>Related Resources</h2>
  <ul>
    {items.map((i) => <li><a href={i.href}>{i.label}</a></li>)}
  </ul>
</section>
`,
);

/* ------------------ PROBLEM PAGE ------------------ */
write(
  "src/pages/why-is-my-website-slow/[slug].astro",
  `
---
import { PROBLEMS, TIER1 } from "../../data/pseo";
import { relatedForProblem } from "../../lib/related";
import RelatedLinks from "../../components/RelatedLinks.astro";
import { siteUrl, titleCase, breadcrumb, faq, articleSchema, organizationSchema, calculateKeywordDensity } from "../../lib/seo";

export const prerender = false;

const entry = PROBLEMS.find(p=>p.slug===Astro.params.slug);
if (!entry) {
  throw new Error(\`Problem not found for slug: \${Astro.params.slug ?? "unknown"}\`);
}
const related = relatedForProblem(entry.slug);

// Generate schemas
const breadcrumbSchema = breadcrumb([
  { name: "Home", item: "/" },
  { name: "SEO Issues", item: "/why-is-my-website-slow/" },
  { name: entry.keyword }
]);
const faqSchema = faq(entry.faqs);
const articleSchemaData = articleSchema(
  entry.h1,
  entry.metaDescription,
  "Why Is My Website Slow",
  new Date().toISOString(),
  new Date().toISOString()
);
const orgSchema = organizationSchema();

// Calculate keyword density
const allContent = \`\${entry.primaryCause} \${entry.quickWins.join(' ')} \${entry.detailedAnalysis.join(' ')} \${entry.solutions.map(s => \`\${s.title} \${s.description} \${s.steps.join(' ')}\`).join(' ')} \${entry.faqs.map(f => \`\${f.question} \${f.answer}\`).join(' ')}\`;
const keywordDensity = calculateKeywordDensity(allContent, entry.keyword);
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{entry.h1}</title>
  <meta name="description" content={entry.metaDescription} />
  <meta name="keywords" content={entry.keyword} />
  <link rel="canonical" href={siteUrl("/why-is-my-website-slow/"+entry.slug)} />
  
  <!-- Schema markup -->
  <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(articleSchemaData)}</script>
  <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
  
  <!-- Open Graph / Social Media Tags -->
  <meta property="og:title" content={entry.h1} />
  <meta property="og:description" content={entry.metaDescription} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={siteUrl("/why-is-my-website-slow/"+entry.slug)} />
  
  <!-- Twitter Card Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={entry.h1} />
  <meta name="twitter:description" content={entry.metaDescription} />
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/" itemprop="item"><span itemprop="name">Home</span></a>
          <meta itemprop="position" content="1" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/why-is-my-website-slow/" itemprop="item"><span itemprop="name">SEO Issues</span></a>
          <meta itemprop="position" content="2" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">{entry.keyword}</span>
          <meta itemprop="position" content="3" />
        </li>
      </ol>
    </nav>
  </header>

  <main>
    <article>
      <header>
        <h1>{entry.h1}</h1>
        <p class="meta-description">{entry.metaDescription}</p>
      </header>

      <section>
        <h2>Primary Cause</h2>
        <p>{entry.primaryCause}</p>
      </section>

      <section>
        <h2>Detailed Analysis</h2>
        <ul>
          {entry.detailedAnalysis.map(paragraph => <li>{paragraph}</li>)}
        </ul>
      </section>

      <section>
        <h2>Quick Wins</h2>
        <ul>
          {entry.quickWins.map(win => <li>{win}</li>)}
        </ul>
      </section>

      <section>
        <h2>Step-by-Step Solutions</h2>
        {entry.solutions.map(solution => (
          <div class="solution">
            <h3>{solution.title}</h3>
            <p>{solution.description}</p>
            <h4>Steps:</h4>
            <ol>
              {solution.steps.map(step => <li>{step}</li>)}
            </ol>
          </div>
        ))}
      </section>

      <section>
        <h2>Statistics & Impact</h2>
        <div class="stats-grid">
          {entry.statistics.map(stat => (
            <div class="stat-card">
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Frequently Asked Questions</h2>
        <dl class="faq-section">
          {entry.faqs.map(faqItem => (
            <>
              <dt>{faqItem.question}</dt>
              <dd>{faqItem.answer}</dd>
            </>
          ))}
        </dl>
      </section>

      <section>
        <h2>External Resources</h2>
        <ul>
          {entry.outboundLinks.map(link => (
            <li><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></li>
          ))}
        </ul>
      </section>
    </article>

    <aside>
      <h2>Ready to Improve Your Site Speed?</h2>
      <p>{entry.conversionImpact}</p>
      <a href={TIER1.audit} class="cta-button">Get Your Free Website Speed Audit</a>
    </aside>
  </main>

  <RelatedLinks items={related}/>

  <footer>
    <p>Page generated with {keywordDensity}% keyword density for "{entry.keyword}"</p>
  </footer>
</body>
</html>
`,
);

/* ------------------ HUB PAGES ------------------ */
write(
  "src/pages/why-is-my-website-slow/index.astro",
  `
---
import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../../data/pseo";
import { siteUrl, breadcrumb, organizationSchema } from "../../lib/seo";

// Generate schemas
const breadcrumbSchema = breadcrumb([
  { name: "Home", item: "/" },
  { name: "SEO Issues" }
]);
const orgSchema = organizationSchema();
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Why Is My Website Slow? Common Issues & Solutions</title>
  <meta name="description" content="Discover the most common reasons why websites are slow and learn expert solutions to fix them. Comprehensive guide to website performance optimization." />
  <link rel="canonical" href={siteUrl("/why-is-my-website-slow/")} />
  
  <!-- Schema markup -->
  <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
  
  <!-- Open Graph / Social Media Tags -->
  <meta property="og:title" content="Why Is My Website Slow? Common Issues & Solutions" />
  <meta property="og:description" content="Discover the most common reasons why websites are slow and learn expert solutions to fix them. Comprehensive guide to website performance optimization." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={siteUrl("/why-is-my-website-slow/")} />
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/" itemprop="item"><span itemprop="name">Home</span></a>
          <meta itemprop="position" content="1" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">SEO Issues</span>
          <meta itemprop="position" content="2" />
        </li>
      </ol>
    </nav>
  </header>

  <main>
    <h1>Why Is My Website Slow? Common Issues & Solutions</h1>
    <p>Website speed is critical for user experience, search rankings, and conversions. Explore the most common performance issues affecting different platforms and industries:</p>

    <section>
      <h2>By Platform</h2>
      <ul>
        {PLATFORMS.map(platform => (
          <li><a href={\`/why-is-my-\${platform.platform}-site-slow\`} title={\`Learn about \${platform.keyword}\`}>{platform.keyword}</a></li>
        ))}
      </ul>
    </section>

    <section>
      <h2>Common Problems</h2>
      <ul>
        {PROBLEMS.map(p=>(
          <li><a href={"/why-is-my-website-slow/"+p.slug} title={p.metaDescription}>{p.keyword}</a></li>
        ))}
      </ul>
    </section>

    <section>
      <h2>By Industry</h2>
      <ul>
        {INDUSTRIES.map(industry => (
          <li><a href={\`/website-speed-audit/\${industry.industry}\`} title={\`Website speed audit for \${industry.keyword}\`}>{industry.keyword}</a></li>
        ))}
      </ul>
    </section>

    <section>
      <h2>Need Expert Help?</h2>
      <p>Our comprehensive website speed audits identify all performance bottlenecks and provide prioritized solutions.</p>
      <a href="/website-speed-audit/" class="cta-button">Get Your Free Audit</a>
    </section>
  </main>
</body>
</html>
`,
);

/* ------------------ PLATFORM PAGES ------------------ */
write(
  "src/pages/website-speed-audit/[platform].astro",
  `
---
import { PLATFORMS, TIER1 } from "../../data/pseo";
import { siteUrl, breadcrumb, organizationSchema, calculateKeywordDensity } from "../../lib/seo";

export const prerender = false;

const platform = PLATFORMS.find(p => p.platform === Astro.params.platform);
if (!platform) {
  throw new Error(\`Platform not found for: \${Astro.params.platform ?? "unknown"}\`);
}

// Generate schemas
const breadcrumbSchema = breadcrumb([
  { name: "Home", item: "/" },
  { name: "Website Speed Audit", item: "/website-speed-audit/" },
  { name: platform.platform }
]);
const orgSchema = organizationSchema();

// Calculate keyword density
const allContent = \`\${platform.topIssues.join(' ')} \${platform.commonSolutions.join(' ')}\`;
const keywordDensity = calculateKeywordDensity(allContent, platform.keyword);
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{platform.keyword}</title>
  <meta name="description" content={\`Comprehensive speed audit for \${platform.platform} websites. Identify performance bottlenecks and optimize your \${platform.platform} site for better user experience and search rankings.\`} />
  <meta name="keywords" content={platform.keyword} />
  <link rel="canonical" href={siteUrl(\`/website-speed-audit/\${platform.platform}/\`)} />
  
  <!-- Schema markup -->
  <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
  
  <!-- Open Graph / Social Media Tags -->
  <meta property="og:title" content={platform.keyword} />
  <meta property="og:description" content={\`Comprehensive speed audit for \${platform.platform} websites. Identify performance bottlenecks and optimize your \${platform.platform} site for better user experience and search rankings.\`} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={siteUrl(\`/website-speed-audit/\${platform.platform}/\`)} />
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/" itemprop="item"><span itemprop="name">Home</span></a>
          <meta itemprop="position" content="1" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/website-speed-audit/" itemprop="item"><span itemprop="name">Website Speed Audit</span></a>
          <meta itemprop="position" content="2" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">{platform.platform}</span>
          <meta itemprop="position" content="3" />
        </li>
      </ol>
    </nav>
  </header>

  <main>
    <article>
      <header>
        <h1>{platform.keyword}</h1>
        <p>Discover how to optimize your {platform.platform} website for superior performance and user experience.</p>
      </header>

      <section>
        <h2>Common Performance Issues with {platform.platform}</h2>
        <ul>
          {platform.topIssues.map(issue => <li>{issue}</li>)}
        </ul>
      </section>

      <section>
        <h2>Best Solutions for {platform.platform}</h2>
        <ul>
          {platform.commonSolutions.map(solution => <li>{solution}</li>)}
        </ul>
      </section>

      <section>
        <h2>Average Load Times</h2>
        <p>Most {platform.platform} sites load in approximately <strong>{platform.avgLoadTime}</strong>, but with proper optimization, you can achieve much faster speeds.</p>
      </section>

      <section>
        <h2>Ready to Optimize Your {platform.platform} Site?</h2>
        <p>Get a comprehensive performance audit with actionable recommendations.</p>
        <a href={TIER1.audit} class="cta-button">Request Your Free Audit</a>
      </section>
    </article>
  </main>

  <footer>
    <p>Page generated with {keywordDensity}% keyword density for "{platform.keyword}"</p>
  </footer>
</body>
</html>
`,
);

/* ------------------ INDUSTRY PAGES ------------------ */
write(
  "src/pages/website-speed-audit/[industry].astro",
  `
---
import { INDUSTRIES, TIER1 } from "../../data/pseo";
import { siteUrl, breadcrumb, organizationSchema, calculateKeywordDensity } from "../../lib/seo";

export const prerender = false;

const industry = INDUSTRIES.find(i => i.industry === Astro.params.industry);
if (!industry) {
  throw new Error(\`Industry not found for: \${Astro.params.industry ?? "unknown"}\`);
}

// Generate schemas
const breadcrumbSchema = breadcrumb([
  { name: "Home", item: "/" },
  { name: "Website Speed Audit", item: "/website-speed-audit/" },
  { name: industry.industry }
]);
const orgSchema = organizationSchema();

// Calculate keyword density
const allContent = \`\${industry.conversionImpact} \${industry.stats.map(s => \`\${s.value} \${s.label}\`).join(' ')}\`;
const keywordDensity = calculateKeywordDensity(allContent, industry.keyword);
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{industry.keyword}</title>
  <meta name="description" content={\`Specialized website speed audit for \${industry.industry} businesses. Improve performance, conversions, and search rankings with our industry-specific optimization.\`} />
  <meta name="keywords" content={industry.keyword} />
  <link rel="canonical" href={siteUrl(\`/website-speed-audit/\${industry.industry}/\`)} />
  
  <!-- Schema markup -->
  <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
  
  <!-- Open Graph / Social Media Tags -->
  <meta property="og:title" content={industry.keyword} />
  <meta property="og:description" content={\`Specialized website speed audit for \${industry.industry} businesses. Improve performance, conversions, and search rankings with our industry-specific optimization.\`} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={siteUrl(\`/website-speed-audit/\${industry.industry}/\`)} />
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/" itemprop="item"><span itemprop="name">Home</span></a>
          <meta itemprop="position" content="1" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <a href="/website-speed-audit/" itemprop="item"><span itemprop="name">Website Speed Audit</span></a>
          <meta itemprop="position" content="2" />
        </li>
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">{industry.industry}</span>
          <meta itemprop="position" content="3" />
        </li>
      </ol>
    </nav>
  </header>

  <main>
    <article>
      <header>
        <h1>{industry.keyword}</h1>
        <p>Specialized performance optimization for {industry.industry} websites to boost conversions and search rankings.</p>
      </header>

      <section>
        <h2>Industry-Specific Performance Impact</h2>
        <p>{industry.conversionImpact}</p>
        <p>On average, {industry.industry} businesses lose {industry.avgConversionLoss} in conversions due to slow website performance.</p>
      </section>

      <section>
        <h2>Key Performance Statistics</h2>
        <ul>
          {industry.stats.map(stat => <li><strong>{stat.value}</strong>: {stat.label}</li>)}
        </ul>
      </section>

      <section>
        <h2>Common Tech Stacks</h2>
        <p>Most {industry.industry} sites use: {industry.commonStack.join(', ')}.</p>
      </section>

      <section>
        <h2>Improve Your {industry.industry} Site Performance</h2>
        <p>Get an industry-specific audit with tailored recommendations to maximize your ROI.</p>
        <a href={TIER1.audit} class="cta-button">Get Your Free Audit</a>
      </section>
    </article>
  </main>

  <footer>
    <p>Page generated with {keywordDensity}% keyword density for "{industry.keyword}"</p>
  </footer>
</body>
</html>
`,
);

console.log("\\n✅ PSEO BOOTSTRAP COMPLETE");
`);

/* ------------------ STATIC PATH GENERATORS ------------------ */
write(
  "src/lib/staticPaths.ts",
  `
import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../data/pseo";

// Generate static paths for all dynamic routes
export const generateProblemPaths = () => PROBLEMS.map(p => ({params: {slug: p.slug}}));
export const generatePlatformPaths = () => PLATFORMS.map(p => ({params: {platform: p.platform}}));
export const generateIndustryPaths = () => INDUSTRIES.map(i => ({params: {industry: i.industry}}));
`);

/* ------------------ SITEMAP INTEGRATION ------------------ */
write(
  "src/lib/sitemap.ts",
  `
import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../data/pseo";
import { siteUrl } from "./seo";

// Generate URLs for sitemap
export const getSitemapUrls = () => {
  const urls = [
    // Static pages
    { url: "/", changefreq: "weekly", priority: 1.0 },
    { url: "/website-speed-audit/", changefreq: "weekly", priority: 0.9 },
    { url: "/why-is-my-website-slow/", changefreq: "weekly", priority: 0.9 },

    // Problem pages
    ...PROBLEMS.map(p => ({
      url: `/why-is-my-website-slow/${p.slug}/`,
      changefreq: "weekly",
      priority: 0.8
    })),

    // Platform pages
    ...PLATFORMS.map(p => ({
      url: `/website-speed-audit/${p.platform}/`,
      changefreq: "weekly",
      priority: 0.8
    })),

    // Industry pages
    ...INDUSTRIES.map(i => ({
      url: `/website-speed-audit/${i.industry}/`,
      changefreq: "weekly",
      priority: 0.8
    }))
  ];

  return urls;
};
\`);
