import type { APIContext } from "astro";
import { env } from "./env";
import { createSupabaseAdminClient } from "./supabase/admin";

/**
 * Admin access is granted by either:
 *  - the shared INTERNAL_DASHBOARD_KEY (same pattern already used by
 *    /internal/funnel and /api/debug) - works before any admin user exists,
 *  - or a logged-in user whose profiles.is_admin flag is set (see
 *    supabase/migrations/20260822010000_add_profiles_is_admin.sql).
 *
 * Note: this only gates *access*, not accountability - actions taken via
 * the shared key aren't attributable to a specific person. Fine for a
 * single founder; worth requiring a real admin user (not the key) for
 * mutating actions once there's more than one person with the key.
 */
async function hasAdminAccess(context: Pick<APIContext, "url" | "request" | "locals">): Promise<boolean> {
  const expectedKey = env.INTERNAL_DASHBOARD_KEY();
  const providedKey =
    context.url.searchParams.get("key") ?? context.request.headers.get("x-internal-dashboard-key");
  if (expectedKey && providedKey === expectedKey) return true;

  return hasRealAdminUser(context);
}

/** True only for a logged-in user with profiles.is_admin - never the shared key. */
async function hasRealAdminUser(context: Pick<APIContext, "locals">): Promise<boolean> {
  const user = context.locals.user;
  if (!user) return false;

  const admin = createSupabaseAdminClient();
  if (!admin) return false;

  const { data } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return Boolean(data?.is_admin);
}

/** For Astro pages: returns a Response to render/redirect if access is denied, or null if allowed. */
export async function requireAdminPage(
  context: Pick<APIContext, "url" | "request" | "locals" | "redirect">
): Promise<Response | null> {
  if (await hasAdminAccess(context)) return null;
  if (context.locals.user) {
    return new Response("Not found", { status: 404 });
  }
  return context.redirect(`/login?next=${encodeURIComponent(context.url.pathname + context.url.search)}`);
}

/** For API routes: returns a Response to send if access is denied, or null if allowed. */
export async function requireAdminApi(
  context: Pick<APIContext, "url" | "request" | "locals">
): Promise<Response | null> {
  if (await hasAdminAccess(context)) return null;
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * For API routes that *mutate* state (cancel a subscription, unlock/refund a
 * report): deliberately narrower than requireAdminApi. The shared
 * INTERNAL_DASHBOARD_KEY is accepted for *viewing* the dashboard (useful
 * before any admin user exists), but a mutating action taken via the shared
 * key isn't attributable to a specific person - once real admin users exist,
 * require one here so every mutation has a real actor behind it.
 */
export async function requireAdminMutation(
  context: Pick<APIContext, "request" | "locals">
): Promise<Response | null> {
  if (await hasRealAdminUser(context)) return null;
  if (context.locals.user) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({ error: "Sign in with an admin account to perform this action" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
