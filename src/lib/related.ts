import { PROBLEMS, PLATFORMS, INDUSTRIES } from "../data/pseo";

type RelatedLink = { href: string; label: string };

type Candidate = RelatedLink & { score: number };

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

const overlapScore = (a: string, b: string) => {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  let score = 0;
  for (const token of setA) {
    if (setB.has(token)) score += 1;
  }
  return score;
};

const dedupe = (items: RelatedLink[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
};

const topLinks = (candidates: Candidate[], count: number) => {
  return dedupe(
    [...candidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(({ href, label }) => ({ href, label }))
  );
};

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const relatedForProblem = (slug: string, count = 5): RelatedLink[] => {
  const problem = PROBLEMS.find((entry) => entry.slug === slug);
  if (!problem) return [];

  const candidates: Candidate[] = [];
  for (const other of PROBLEMS) {
    if (other.slug === problem.slug) continue;
    const score =
      overlapScore(problem.keyword, other.keyword) +
      (other.platform === problem.platform ? 4 : 0) +
      (other.industry === problem.industry ? 3 : 0);
    if (score > 0) {
      candidates.push({
        href: `/why-is-my-website-slow/${other.slug}/`,
        label: other.keyword,
        score,
      });
    }
  }

  candidates.push(
    {
      href: `/website-speed-audit/platform/${problem.platform}/`,
      label: `${titleCase(problem.platform)} speed audit`,
      score: 9,
    },
    {
      href: `/website-speed-audit/industry/${problem.industry}/`,
      label: `Speed audit for ${titleCase(problem.industry)}`,
      score: 8,
    },
    { href: "/scan", label: "Run another speed scan", score: 11 },
    { href: "/billing", label: "Start monitoring", score: 7 }
  );

  return topLinks(candidates, count);
};

export const relatedForPlatform = (platformSlug: string, count = 5): RelatedLink[] => {
  const platform = PLATFORMS.find((entry) => entry.platform === platformSlug);
  if (!platform) return [];

  const platformProblems = PROBLEMS.filter((problem) => problem.platform === platform.platform);
  const candidates: Candidate[] = platformProblems.map((problem, index) => ({
    href: `/why-is-my-website-slow/${problem.slug}/`,
    label: problem.h1,
    score: 12 - index,
  }));

  const industriesForPlatform = new Set(platformProblems.map((problem) => problem.industry));
  for (const industry of industriesForPlatform) {
    const industryEntry = INDUSTRIES.find((entry) => entry.industry === industry);
    if (!industryEntry) continue;
    candidates.push({
      href: `/website-speed-audit/industry/${industryEntry.industry}/`,
      label: industryEntry.keyword,
      score: 6 + overlapScore(platform.keyword, industryEntry.keyword),
    });
  }

  candidates.push({ href: "/scan", label: "Run another speed scan", score: 11 });
  candidates.push({ href: "/billing", label: "Start monitoring", score: 7 });

  return topLinks(candidates, count);
};

export const relatedForIndustry = (industrySlug: string, count = 5): RelatedLink[] => {
  const industry = INDUSTRIES.find((entry) => entry.industry === industrySlug);
  if (!industry) return [];

  const industryProblems = PROBLEMS.filter((problem) => problem.industry === industry.industry);
  const candidates: Candidate[] = industryProblems.map((problem, index) => ({
    href: `/why-is-my-website-slow/${problem.slug}/`,
    label: problem.h1,
    score: 12 - index,
  }));

  const platformsForIndustry = new Set(industryProblems.map((problem) => problem.platform));
  for (const platform of platformsForIndustry) {
    const platformEntry = PLATFORMS.find((entry) => entry.platform === platform);
    if (!platformEntry) continue;
    candidates.push({
      href: `/website-speed-audit/platform/${platformEntry.platform}/`,
      label: platformEntry.keyword,
      score: 6 + overlapScore(industry.keyword, platformEntry.keyword),
    });
  }

  candidates.push({ href: "/scan", label: "Run another speed scan", score: 11 });
  candidates.push({ href: "/billing", label: "Start monitoring", score: 7 });

  return topLinks(candidates, count);
};
