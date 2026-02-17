export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL required");
  if (trimmed.length > 2048) throw new Error("URL too long");

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!url.protocol.startsWith("http")) throw new Error("Only http/https supported");
  
  // Prevent SSRF attacks by blocking internal addresses
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    // Check for IP address format (IPv4)
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
    // Block common internal hostnames
    hostname === "internal" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".svc.cluster.local") ||
    hostname.endsWith(".docker.internal")
  ) {
    throw new Error("Internal URLs not allowed");
  }

  // Validate IP address segments to prevent private IP ranges
  const ipSegments = hostname.split('.');
  if (ipSegments.length === 4 && ipSegments.every(seg => /^\d+$/.test(seg))) {
    const [a, b, c, d] = ipSegments.map(Number);
    if (
      a === 127 || // localhost
      a === 10 || // 10.x.x.x
      (a === 172 && b >= 16 && b <= 31) || // 172.16.x.x - 172.31.x.x
      (a === 192 && b === 168) // 192.168.x.x
    ) {
      throw new Error("Internal URLs not allowed");
    }
  }

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
