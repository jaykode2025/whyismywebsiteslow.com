export const siteUrl = (p: string) => "https://www.whyismywebsiteslow.com" + p;
export const titleCase = (s: string) => s.replace(/\b\w/g, (m: string) => m.toUpperCase());
export const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + "…" : s;
export const jsonLd = (o: any) => JSON.stringify(o);
export const humanizeSlug = (s: string) => s.replace(/-/g, " ").trim();

const cleanFragment = (value: string) => value.replace(/\s+/g, " ").trim();

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
    acceptedAnswer: { "@type": "Answer", text: f.answer }
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
  const baseTitle = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
  const fullTitle = brand ? `${baseTitle} - ${brand}` : baseTitle;
  return fullTitle.length > 60 ? fullTitle.substring(0, 57) + "..." : fullTitle;
};

export const buildSeoTitle = (...parts: Array<string | undefined>) => {
  const cleaned = parts.map((part) => cleanFragment(part ?? "")).filter(Boolean);
  if (cleaned.length === 0) return "";

  const withSeparators = cleaned.join(" | ");
  if (withSeparators.length <= 60) return withSeparators;

  const withoutLast = cleaned.slice(0, -1).join(" | ");
  if (withoutLast.length > 0 && withoutLast.length <= 60) return withoutLast;

  return truncate(cleaned.join(" - "), 60);
};

export const buildSeoDescription = (lead: string, supportingPoints: string[] = []) => {
  const fragments = [lead, ...supportingPoints]
    .map((item) => cleanFragment(item))
    .filter(Boolean);

  return truncate(fragments.join(" "), 155);
};

// Calculate keyword density in content
export const calculateKeywordDensity = (content: string, keyword: string): number => {
  const words = content.toLowerCase().match(/\b(\w+)\b/g) || [];
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  
  let count = 0;
  for (const kw of keywordWords) {
    count += words.filter(word => word.includes(kw)).length;
  }
  
  return parseFloat(((count / words.length) * 100).toFixed(2));
};
