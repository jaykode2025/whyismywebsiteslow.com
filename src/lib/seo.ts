export const siteUrl = p => "https://whyismywebsiteslow.com" + p;
export const titleCase = s => s.replace(/\b\w/g, m => m.toUpperCase());
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
