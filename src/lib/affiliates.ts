import type { SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

export const AFFILIATE_COOKIE = "wimws_aff";
const AFFILIATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60-day first-touch attribution window
const CODE_PATTERN = /^[a-zA-Z0-9_-]{2,40}$/;

/**
 * Called from middleware on every request. If `?ref=<code>` is present and
 * looks like a plausible code, and the visitor doesn't already carry an
 * attribution cookie, stamp one - first touch wins, so a partner doesn't
 * lose credit if the visitor later clicks a different ?ref= link (e.g. a
 * retargeting ad) before converting.
 */
export function captureAffiliateRef(url: URL, cookies: AstroCookies) {
  const ref = url.searchParams.get("ref");
  if (!ref || !CODE_PATTERN.test(ref)) return;
  if (cookies.has(AFFILIATE_COOKIE)) return;

  cookies.set(AFFILIATE_COOKIE, ref, {
    path: "/",
    maxAge: AFFILIATE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: url.protocol === "https:",
  });
}

export function readAffiliateRefCookie(cookies: AstroCookies): string | null {
  return cookies.get(AFFILIATE_COOKIE)?.value ?? null;
}

/**
 * Validates a cookie-supplied code against real, active affiliates before
 * it's trusted for anything - the cookie value is visitor-controlled, so
 * an arbitrary/stale/paused code must not silently attach to a checkout.
 */
export async function resolveActiveAffiliateCode(
  code: string | null,
  admin: SupabaseClient
): Promise<string | null> {
  if (!code) return null;
  const { data } = await admin
    .from("affiliates")
    .select("code")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();
  return data?.code ?? null;
}

/**
 * Called from the Stripe webhook on checkout.session.completed, for any
 * mode. No-ops if the session carries no (or an unknown/paused) affiliate
 * code. Idempotent via the unique constraint on stripe_session_id - a
 * retried webhook delivery just hits the duplicate-key branch below.
 */
export async function recordAffiliateConversion(
  session: {
    id: string;
    mode?: string;
    metadata?: Record<string, string | null> | null;
    amount_total?: number | null;
    currency?: string | null;
  },
  admin: SupabaseClient
): Promise<void> {
  const code = session.metadata?.affiliate_code;
  if (!code) return;

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, commission_pct")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();
  if (!affiliate) return;

  const amountCents = session.amount_total ?? 0;
  if (amountCents <= 0) return;
  const commissionCents = Math.round((amountCents * Number(affiliate.commission_pct)) / 100);

  const { error } = await admin.from("affiliate_referrals").insert({
    affiliate_id: affiliate.id,
    stripe_session_id: session.id,
    kind: session.mode === "subscription" ? "subscription" : "report_unlock",
    amount_cents: amountCents,
    currency: (session.currency ?? "usd").toLowerCase(),
    commission_cents: commissionCents,
  });
  if (error && (error as any).code !== "23505") {
    // 23505 = unique_violation on stripe_session_id - already recorded, not an error.
    console.error("recordAffiliateConversion failed:", error);
  }
}
