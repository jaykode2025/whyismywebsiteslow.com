import type { Report } from "./types";

type RunChecksOptions = {
  html?: string;
  response?: Response;
};

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

function hasMetaDescription(html: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const name = (attrs.name ?? attrs.property ?? "").toLowerCase();
    if (name === "description" && (attrs.content ?? "").trim().length > 0) return true;
  }
  return false;
}

function hasCanonical(html: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const rel = (attrs.rel ?? "").toLowerCase();
    if (rel.split(/\s+/).includes("canonical") && (attrs.href ?? "").trim().length > 0) return true;
  }
  return false;
}

function hasH1(html: string) {
  return /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
}

function hasSecurityHeaders(res: Response) {
  const headers = res.headers;
  const names = [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
  ];
  return names.some((name) => headers.has(name));
}

export async function runChecks(url: string, options: RunChecksOptions = {}): Promise<Report["checks"]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = options.response ?? (await fetch(url, { 
      headers: { "User-Agent": "WMSSBot/0.1" },
      signal: controller.signal 
    }));
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const html = options.html ?? (await res.text());
    const encoding = res.headers.get("content-encoding") ?? "";
    const cacheControl = res.headers.get("cache-control") ?? "";
    const server = res.headers.get("server") ?? "";
    const cfCache = res.headers.get("cf-cache-status") ?? "";
    const cdn = server.toLowerCase().includes("cloudflare") || cfCache ? "detected" : "unknown";

    const compression = encoding.includes("br")
      ? "br"
      : encoding.includes("gzip")
        ? "gzip"
        : "none";

    const cachePolicy = cacheControl.includes("max-age=31536000") || cacheControl.includes("immutable")
      ? "good"
      : cacheControl.includes("max-age")
        ? "ok"
        : "bad";

    const httpVersion = (res as any).httpVersion ?? "unknown";
    const version = httpVersion.includes("2")
      ? "h2"
      : httpVersion.includes("3")
        ? "h3"
        : httpVersion.includes("1")
          ? "h1"
          : "unknown";

    const finalUrl = res.url ? new URL(res.url) : new URL(url);

    return {
      headers: {
        compression,
        cacheControl: cachePolicy,
        cdn,
        httpVersion: version,
      },
      page: {
        htmlKb: Math.round((new TextEncoder().encode(html).length / 1024) * 10) / 10,
        requestCount: 1,
      },
      hasMetaDescription: hasMetaDescription(html),
      hasCanonical: hasCanonical(html),
      hasH1: hasH1(html),
      hasHttps: finalUrl.protocol === "https:",
      hasSecurityHeaders: hasSecurityHeaders(res),
    };
  } catch (error: any) {
    console.warn(`Checks failed for ${url}:`, error.message);
    return {
      headers: {
        compression: "none",
        cacheControl: "bad",
        cdn: "unknown",
        httpVersion: "unknown",
      },
      page: {},
      hasMetaDescription: false,
      hasCanonical: false,
      hasH1: false,
      hasHttps: url.startsWith("https://"),
      hasSecurityHeaders: false,
    };
  }
}
