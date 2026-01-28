import type { Report } from "./types";

export async function runChecks(url: string): Promise<Report["checks"]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "WMSSBot/0.1" } });
    const html = await res.text();
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
    };
  } catch {
    return {
      headers: {
        compression: "none",
        cacheControl: "bad",
        cdn: "unknown",
        httpVersion: "unknown",
      },
      page: {},
    };
  }
}
