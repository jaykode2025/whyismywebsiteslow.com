/**
 * Lightweight CSRF mitigation for endpoints called from statically
 * prerendered pages, where a per-visitor CSRF cookie/token can't be baked
 * into the HTML at build time (see leads/preview.ts, leads/service.ts -
 * several of their calling pages use `export const prerender = true`).
 *
 * Checks the Origin header (sent by browsers on same-site POSTs too, not
 * just cross-site ones) against the request's own host, falling back to
 * Referer. Not as strong as a real per-session token, but does block the
 * classic cross-site <form>/fetch CSRF case without requiring a live
 * request context on prerendered pages.
 */
export function isSameOriginRequest(request: Request): boolean {
  const requestHost = new URL(request.url).host;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === requestHost;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === requestHost;
    } catch {
      return false;
    }
  }

  // Neither header present - most real browser navigations/fetches send at
  // least one of these, so treat a request with neither as suspicious.
  return false;
}
