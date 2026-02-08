export const siteUrl = (p: string) => "https://whyismywebsiteslow.com" + p;
export const titleCase = (s: string) => s.replace(/\b\w/g, (m: string) => m.toUpperCase());
export const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + "…" : s;
export const jsonLd = (o: any) => JSON.stringify(o);
export const breadcrumb = (items: any[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((i, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: i.name,
    item: i.item
  }))
});
export const faq = (faqs: any[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(f => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a }
  }))
});
