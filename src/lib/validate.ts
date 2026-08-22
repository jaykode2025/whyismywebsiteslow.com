/**
 * Returns true if a hostname/IP points at an internal, private, loopback,
 * link-local (including the 169.254.169.254 cloud metadata address), or
 * otherwise non-public address. Used both to validate user-submitted URLs
 * and to re-validate each hop of a redirect chain before following it.
 */
export function isBlockedHostname(hostnameRaw: string): boolean {
  const hostname = hostnameRaw.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("169.254.") || // link-local, incl. cloud metadata 169.254.169.254
    hostname === "internal" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".svc.cluster.local") ||
    hostname.endsWith(".docker.internal")
  ) {
    return true;
  }

  // IPv6 loopback / unspecified / link-local
  if (hostname === "::1" || hostname === "::" || hostname.startsWith("fe80:")) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) - unwrap and re-check
  if (hostname.startsWith("::ffff:")) {
    return isBlockedHostname(hostname.slice("::ffff:".length));
  }

  // Dotted-quad IPv4 (validate each octet properly, unlike a plain regex)
  const ipSegments = hostname.split(".");
  if (ipSegments.length === 4 && ipSegments.every((seg) => /^\d{1,3}$/.test(seg))) {
    const nums = ipSegments.map(Number);
    if (nums.every((n) => n <= 255)) {
      const [a, b] = nums;
      if (
        a === 127 ||
        a === 10 ||
        a === 0 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)
      ) {
        return true;
      }
    }
  }

  // Single decimal-integer IP form, e.g. http://2130706433/ === 127.0.0.1
  if (/^\d+$/.test(hostname)) {
    const num = Number(hostname);
    if (Number.isSafeInteger(num) && num >= 0 && num <= 4294967295) {
      const a = (num >>> 24) & 255;
      const b = (num >>> 16) & 255;
      if (
        a === 127 ||
        a === 10 ||
        a === 0 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)
      ) {
        return true;
      }
    }
  }

  return false;
}

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

  // Prevent SSRF attacks by blocking internal/private/link-local addresses
  if (isBlockedHostname(url.hostname)) {
    throw new Error("Internal URLs not allowed");
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
