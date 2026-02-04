type SeoPriority = "high" | "medium" | "low";

export type SeoRecommendation = {
  issue: string;
  recommendation: string;
  priority: SeoPriority;
};

export type SeoAnalysisResult = {
  score: number;
  meta: {
    title?: string;
    description?: string;
    canonical?: string;
  };
  structure: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasH1: boolean;
    h1Text?: string;
  };
  content: {
    wordCount: number;
    readingTimeMinutes: number;
  };
  keywordAnalysis: {
    primaryKeyword: string | null;
    occurrences: number;
    density: number;
  };
  recommendations: SeoRecommendation[];
};

function decodeHtml(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tag))) {
    const key = match[1]?.toLowerCase();
    if (!key) continue;
    const value = (match[2] ?? match[3] ?? match[4] ?? "").trim();
    attrs[key] = value;
  }
  return attrs;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return undefined;
  return decodeHtml(match[1].replace(/<[^>]*>/g, " ")).trim() || undefined;
}

function extractMeta(html: string, name: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const attrName = (attrs.name ?? attrs.property ?? "").toLowerCase();
    if (attrName === name && attrs.content) return decodeHtml(attrs.content).trim();
  }
  return undefined;
}

function extractCanonical(html: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const rel = (attrs.rel ?? "").toLowerCase();
    if (rel.split(/\s+/).includes("canonical") && attrs.href) return attrs.href;
  }
  return undefined;
}

function extractHeadingText(html: string, tag: string) {
  const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(regex);
  if (!match) return undefined;
  return decodeHtml(match[1].replace(/<[^>]*>/g, " ")).trim() || undefined;
}

function countHeadings(html: string, tag: string) {
  const regex = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  return (html.match(regex) ?? []).length;
}

function extractText(html: string) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtml(stripped).replace(/\s+/g, " ").trim();
}

function countOccurrences(text: string, keyword: string) {
  if (!keyword) return 0;
  let count = 0;
  let index = 0;
  const normalized = keyword.toLowerCase();
  const haystack = text.toLowerCase();
  while (true) {
    index = haystack.indexOf(normalized, index);
    if (index === -1) break;
    count += 1;
    index += normalized.length;
  }
  return count;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeSeo(html: string, targetKeyword?: string): SeoAnalysisResult {
  const title = extractTitle(html);
  const description = extractMeta(html, "description");
  const canonical = extractCanonical(html);
  const h1Text = extractHeadingText(html, "h1");
  const h1Count = countHeadings(html, "h1");
  const h2Count = countHeadings(html, "h2");
  const h3Count = countHeadings(html, "h3");

  const text = extractText(html);
  const words = text.match(/[a-zA-Z0-9]+/g) ?? [];
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  const keyword = targetKeyword?.trim() ? targetKeyword.trim() : null;
  const occurrences = keyword ? countOccurrences(text, keyword) : 0;
  const density = wordCount > 0 && keyword ? Number(((occurrences / wordCount) * 100).toFixed(2)) : 0;

  const recommendations: SeoRecommendation[] = [];
  let score = 100;

  if (!title) {
    score -= 20;
    recommendations.push({
      issue: "Missing title tag",
      recommendation: "Add a unique, descriptive title between 30–60 characters.",
      priority: "high",
    });
  } else if (title.length < 30 || title.length > 60) {
    score -= 10;
    recommendations.push({
      issue: "Title length could be improved",
      recommendation: "Keep the title between 30–60 characters to improve CTR.",
      priority: "medium",
    });
  }

  if (!description) {
    score -= 15;
    recommendations.push({
      issue: "Missing meta description",
      recommendation: "Add a compelling meta description between 70–160 characters.",
      priority: "high",
    });
  } else if (description.length < 70 || description.length > 160) {
    score -= 10;
    recommendations.push({
      issue: "Meta description length could be improved",
      recommendation: "Aim for 70–160 characters to avoid truncation.",
      priority: "medium",
    });
  }

  if (!canonical) {
    score -= 5;
    recommendations.push({
      issue: "Missing canonical tag",
      recommendation: "Add a canonical URL to consolidate duplicate content signals.",
      priority: "low",
    });
  }

  if (!h1Text) {
    score -= 10;
    recommendations.push({
      issue: "Missing H1",
      recommendation: "Add a single H1 that matches the page intent and target keyword.",
      priority: "high",
    });
  }

  if (h1Count > 1) {
    score -= 5;
    recommendations.push({
      issue: "Multiple H1 tags detected",
      recommendation: "Keep a single H1 for clear content structure.",
      priority: "low",
    });
  }

  if (h2Count < 1) {
    score -= 5;
    recommendations.push({
      issue: "Missing H2 structure",
      recommendation: "Use H2 subheadings to organize sections and improve scanability.",
      priority: "low",
    });
  }

  if (wordCount < 300) {
    score -= 15;
    recommendations.push({
      issue: "Thin content",
      recommendation: "Expand the page copy to at least 300 words of helpful content.",
      priority: "high",
    });
  }

  if (keyword) {
    if (density < 0.5) {
      score -= 10;
      recommendations.push({
        issue: "Keyword used too sparingly",
        recommendation: "Mention the target keyword naturally in key sections.",
        priority: "medium",
      });
    } else if (density > 3) {
      score -= 10;
      recommendations.push({
        issue: "Keyword density too high",
        recommendation: "Reduce repetition to avoid keyword stuffing.",
        priority: "medium",
      });
    }
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    meta: { title, description, canonical },
    structure: {
      h1Count,
      h2Count,
      h3Count,
      hasH1: Boolean(h1Text),
      h1Text,
    },
    content: {
      wordCount,
      readingTimeMinutes,
    },
    keywordAnalysis: {
      primaryKeyword: keyword,
      occurrences,
      density,
    },
    recommendations,
  };
}
