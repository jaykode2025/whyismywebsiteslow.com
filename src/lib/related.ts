import { PROBLEMS, PLATFORMS, INDUSTRIES, TIER1 } from "../data/pseo";

export const relatedForProblem = (slug: string) => {
  const p = PROBLEMS.find((x) => x.slug === slug);
  if (!p) return [];

  const relatedProblemsByIndustry = PROBLEMS.filter((x) => x.industry === p.industry && x.slug !== slug).slice(0, 2);
  const relatedProblemsByPlatform = PROBLEMS.filter((x) => x.platform === p.platform && x.slug !== slug).slice(0, 2);
  const relatedByPlatform = PLATFORMS.find((platform) => platform.platform === p.platform);
  const relatedByIndustry = INDUSTRIES.find((industry) => industry.industry === p.industry);

  const links = [
    { href: "/why-is-my-website-slow/", label: "All Website Speed Issues" },
    { href: TIER1.audit, label: "Free Website Speed Audit" },
    relatedByPlatform
      ? {
          href: `/website-speed-audit/${relatedByPlatform.platform}/`,
          label: `${relatedByPlatform.platform.charAt(0).toUpperCase() + relatedByPlatform.platform.slice(1)} Speed Audit`
        }
      : null,
    relatedByIndustry
      ? {
          href: `/website-speed-audit/${relatedByIndustry.industry}/`,
          label: relatedByIndustry.keyword
        }
      : null,
    ...relatedProblemsByIndustry.map((x) => ({ href: `/why-is-my-website-slow/${x.slug}/`, label: x.keyword })),
    ...relatedProblemsByPlatform.map((x) => ({ href: `/why-is-my-website-slow/${x.slug}/`, label: x.keyword })),
    { href: TIER1.coreWebVitals, label: "Core Web Vitals Optimization" },
    { href: TIER1.monitoring, label: "Continuous Performance Monitoring" }
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  const seen = new Set<string>();
  return links.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
};
