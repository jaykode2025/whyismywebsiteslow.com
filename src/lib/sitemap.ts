import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../data/pseo";

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
      url: `/website-speed-audit/platform/${p.platform}/`,
      changefreq: "weekly",
      priority: 0.8
    })),
    
    // Industry pages
    ...INDUSTRIES.map(i => ({
      url: `/website-speed-audit/industry/${i.industry}/`,
      changefreq: "weekly",
      priority: 0.8
    }))
  ];
  
  return urls;
};
