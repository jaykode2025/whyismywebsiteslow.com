export async function crawlSite(baseUrl: URL, maxLinks: number) {
  const scannedUrls = [baseUrl.toString()];
  const failures: { url: string; reason: string }[] = [];

  if (maxLinks <= 1) {
    return { scannedUrls, failures };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(baseUrl.toString(), {
      headers: { "User-Agent": "WMSSBot/0.1" },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      failures.push({ url: baseUrl.toString(), reason: `HTTP ${res.status}` });
      return { scannedUrls, failures };
    }
    
    const html = await res.text();
    const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((m) => m[1]);

    const origin = baseUrl.origin;
    const deny = ["/logout", "/admin", "/wp-admin", "/cart", "/checkout", "/login", "/register"];

    for (const href of hrefs) {
      if (scannedUrls.length >= maxLinks) break;
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) continue;

      try {
        const url = new URL(href, origin);
        if (url.origin !== origin) continue;
        if (url.search && url.search.length > 0) continue;
        if (deny.some((path) => url.pathname.startsWith(path))) continue;
        url.hash = "";
        const normalized = url.toString();
        if (!scannedUrls.includes(normalized)) scannedUrls.push(normalized);
      } catch {
        continue;
      }
    }
  } catch (error: any) {
    const reason = error.name === 'AbortError' ? 'Request timeout' : 'Failed to crawl HTML';
    failures.push({ url: baseUrl.toString(), reason });
  }

  return { scannedUrls, failures };
}
