import { defineMiddleware } from "astro/middleware";
import { createSupabaseServerClient } from "./lib/supabase/server";
import { hasSupabaseEnv } from "./lib/env";
import { ensureCsrfToken } from "./lib/csrf";

const CANONICAL_HOST = "whyismywebsiteslow.com";
const REDIRECT_HOSTS = new Set([
  "whyismywebsiteslow.org",
  "www.whyismywebsiteslow.org",
  "www.whyismywebsiteslow.com",
]);

function redirectToCanonicalHost(request: Request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  // Keep localhost and preview deployments accessible.
  if (host === "localhost" || host.endsWith(".vercel.app")) return null;
  if (!REDIRECT_HOSTS.has(host)) return null;

  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  return Response.redirect(url, 308);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const redirect = redirectToCanonicalHost(context.request);
  if (redirect) return redirect;

  context.locals.csrfToken = ensureCsrfToken(context.cookies, context.request);

  if (!hasSupabaseEnv()) return next();

  try {
    const supabase = createSupabaseServerClient(context.cookies, context.request);
    if (supabase) {
      context.locals.supabase = supabase;
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('Auth error in middleware:', error.message);
      }
      context.locals.user = data?.user ?? null;
    }
  } catch (error: any) {
    console.error('Middleware error:', error.message);
  }

  return next();
});
