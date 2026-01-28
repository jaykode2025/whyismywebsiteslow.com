export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL required");
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!url.protocol.startsWith("http")) throw new Error("Only http/https supported");
  url.hash = "";
  return url;
}

export function getHost(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

export function clampLinks(maxLinks?: number) {
  if (!maxLinks || Number.isNaN(maxLinks)) return 0;
  return Math.max(0, Math.min(5, Math.floor(maxLinks)));
}
