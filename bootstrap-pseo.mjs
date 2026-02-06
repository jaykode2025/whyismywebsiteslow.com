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
`,
);

/* ------------------ SEO HELPERS ------------------ */
write(
  "src/lib/seo.ts",
  `
export const siteUrl = p => "https://whyismywebsiteslow.com" + p;
export const titleCase = s => s.replace(/\\b\\w/g, m => m.toUpperCase());
export const truncate = (s,n) => s.length > n ? s.slice(0,n-1)+"…" : s;
export const jsonLd = o => JSON.stringify(o);
export const breadcrumb = items => ({
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  itemListElement: items.map((i,idx)=>({
    "@type":"ListItem",
    position:idx+1,
    name:i.name,
    item:i.item
  }))
});
export const faq = faqs => ({
  "@context":"https://schema.org",
  "@type":"FAQPage",
  mainEntity: faqs.map(f=>({
    "@type":"Question",
    name:f.q,
    acceptedAnswer:{ "@type":"Answer", text:f.a }
  }))
});
`,
);

/* ------------------ RELATED LINKS ------------------ */
write(
  "src/lib/related.ts",
  `
import { PROBLEMS, PLATFORMS, INDUSTRIES, TIER1 } from "../data/pseo";

export const relatedForProblem = slug => {
  const p = PROBLEMS.find(x=>x.slug===slug);
  if(!p) return [];
  return [
    {href:TIER1.audit,label:"Website Speed Audit"},
    {href:TIER1.monitoring,label:"Performance Monitoring"},
    {href:\`/website-speed-audit/\${p.platform}\`,label:"Platform Audit"},
    ...PROBLEMS.filter(x=>x.slug!==slug).slice(0,2)
      .map(x=>({href:\`/why-is-my-website-slow/\${x.slug}\`,label:x.keyword}))
  ];
};
`,
);

/* ------------------ COMPONENT ------------------ */
write(
  "src/components/RelatedLinks.astro",
  `
---
const { items = [] } = Astro.props;
---
<section>
  <h2>Related</h2>
  <ul>
    {items.map(i => <li><a href={i.href}>{i.label}</a></li>)}
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
import { siteUrl, titleCase } from "../../lib/seo";

export function getStaticPaths(){
  return PROBLEMS.map(p=>({params:{slug:p.slug}}));
}

const entry = PROBLEMS.find(p=>p.slug===Astro.params.slug);
const related = relatedForProblem(entry.slug);
---

<html>
<head>
  <title>{titleCase(entry.keyword)}</title>
  <link rel="canonical" href={siteUrl("/why-is-my-website-slow/"+entry.slug)} />
</head>
<body>
  <h1>{entry.keyword}</h1>
  <p>{entry.primaryCause}</p>

  <h2>Quick Wins</h2>
  <ul>{entry.quickWins.map(w=><li>{w}</li>)}</ul>

  <a href={TIER1.audit}>Request Audit</a>
  <RelatedLinks items={related}/>
</body>
</html>
`,
);

/* ------------------ HUB PAGES ------------------ */
write(
  "src/pages/why-is-my-website-slow/index.astro",
  `
---
import { PROBLEMS } from "../../data/pseo";
---
<h1>Why Is My Website Slow?</h1>
<ul>
  {PROBLEMS.map(p=>(
    <li><a href={"/why-is-my-website-slow/"+p.slug}>{p.keyword}</a></li>
  ))}
</ul>
`,
);
console.log("\\n✅ PSEO BOOTSTRAP COMPLETE");
