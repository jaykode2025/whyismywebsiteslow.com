import { PROBLEMS, TIER1 } from "../data/pseo";

export const relatedForProblem = (slug: string) => {
  const p = PROBLEMS.find(x=>x.slug===slug);
  if(!p) return [];
  return [
    {href:TIER1.audit,label:"Website Speed Audit"},
    {href:TIER1.monitoring,label:"Performance Monitoring"},
    {href:`/website-speed-audit/${p.platform}`,label:"Platform Audit"},
    ...PROBLEMS.filter(x=>x.slug!==slug).slice(0,2)
      .map(x=>({href:`/why-is-my-website-slow/${x.slug}`,label:x.keyword}))
  ];
};
