type ImagePriority = "high" | "medium" | "low";

export type ImageRecommendation = {
  issue: string;
  recommendation: string;
  impact: string;
  priority: ImagePriority;
};

export type ImageAuditResult = {
  score: number;
  totalImages: number;
  potentialSavings: number;
  issues: {
    missingAlt: number;
    missingDimensions: number;
    nonModernFormats: number;
    largeImages: number;
    lazyMissing: number;
  };
  largestImages: Array<{ src: string; sizeBytes: number }>;
  recommendations: ImageRecommendation[];
};

const MODERN_FORMATS = ["webp", "avif", "svg"];
const LEGACY_FORMATS = ["jpg", "jpeg", "png", "gif"];

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

function getFormat(src: string) {
  if (src.startsWith("data:")) {
    const match = src.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    return match ? match[1].toLowerCase() : "data";
  }
  try {
    const url = new URL(src);
    const ext = url.pathname.split(".").pop() ?? "";
    return ext.toLowerCase();
  } catch {
    const ext = src.split("?")[0].split("#")[0].split(".").pop() ?? "";
    return ext.toLowerCase();
  }
}

async function headSize(url: string, timeoutMs = 2000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (!res.ok) return undefined;
    const value = res.headers.get("content-length");
    if (!value) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function auditImages(html: string, pageUrl: string): Promise<ImageAuditResult> {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  const images = tags
    .map((tag) => {
      const attrs = parseAttributes(tag);
      const srcRaw = attrs.src || attrs["data-src"] || "";
      if (!srcRaw) return null;
      const src = srcRaw.trim();
      const format = getFormat(src);
      const hasAlt = typeof attrs.alt === "string" && attrs.alt.trim().length > 0;
      const hasDimensions = Boolean(attrs.width && attrs.height);
      const lazy = (attrs.loading ?? "").toLowerCase() === "lazy";
      return { src, format, hasAlt, hasDimensions, lazy };
    })
    .filter(Boolean) as Array<{
    src: string;
    format: string;
    hasAlt: boolean;
    hasDimensions: boolean;
    lazy: boolean;
  }>;

  const totalImages = images.length;
  let missingAlt = 0;
  let missingDimensions = 0;
  let nonModernFormats = 0;
  let lazyMissing = 0;

  for (const img of images) {
    if (!img.hasAlt) missingAlt += 1;
    if (!img.hasDimensions) missingDimensions += 1;
    if (!MODERN_FORMATS.includes(img.format) && LEGACY_FORMATS.includes(img.format)) nonModernFormats += 1;
    if (!img.lazy) lazyMissing += 1;
  }

  const sizeChecks = images.slice(0, 5);
  let potentialSavings = 0;
  let largeImages = 0;
  const largestImages: Array<{ src: string; sizeBytes: number }> = [];

  for (const img of sizeChecks) {
    if (img.src.startsWith("data:")) continue;
    let resolved = "";
    try {
      resolved = new URL(img.src, pageUrl).toString();
    } catch {
      resolved = img.src;
    }
    const size = await headSize(resolved);
    if (typeof size === "number") {
      if (size > 500_000) largeImages += 1;
      if (!MODERN_FORMATS.includes(img.format) && LEGACY_FORMATS.includes(img.format)) {
        potentialSavings += Math.round(size * 0.3);
      }
      largestImages.push({ src: resolved, sizeBytes: size });
    }
  }

  largestImages.sort((a, b) => b.sizeBytes - a.sizeBytes);
  const topLargest = largestImages.slice(0, 5);

  let score = 100;
  score -= Math.min(20, missingAlt * 5);
  score -= Math.min(15, missingDimensions * 3);
  score -= Math.min(20, nonModernFormats * 4);
  score -= Math.min(20, largeImages * 5);
  if (potentialSavings > 500_000) score -= 10;
  if (totalImages > 30) score -= 5;

  const recommendations: ImageRecommendation[] = [];
  if (missingAlt > 0) {
    recommendations.push({
      issue: "Missing alt text",
      recommendation: "Add descriptive alt text to improve accessibility and image SEO.",
      impact: "Improves accessibility and SERP visibility",
      priority: "high",
    });
  }

  if (missingDimensions > 0) {
    recommendations.push({
      issue: "Missing width/height",
      recommendation: "Set image dimensions to reduce layout shifts.",
      impact: "Reduces CLS and layout shifts",
      priority: "medium",
    });
  }

  if (nonModernFormats > 0) {
    recommendations.push({
      issue: "Legacy image formats detected",
      recommendation: "Serve WebP or AVIF for modern browsers.",
      impact: "Cuts image bytes by 25–60%",
      priority: "high",
    });
  }

  if (largeImages > 0) {
    recommendations.push({
      issue: "Large images on the page",
      recommendation: "Resize and compress images larger than 500KB.",
      impact: "Faster LCP and reduced bandwidth",
      priority: "high",
    });
  }

  if (totalImages > 30) {
    recommendations.push({
      issue: "Many images detected",
      recommendation: "Lazy-load below-the-fold images.",
      impact: "Faster initial render",
      priority: "medium",
    });
  }

  return {
    score: clampScore(score),
    totalImages,
    potentialSavings,
    issues: {
      missingAlt,
      missingDimensions,
      nonModernFormats,
      largeImages,
      lazyMissing,
    },
    largestImages: topLargest,
    recommendations,
  };
}
