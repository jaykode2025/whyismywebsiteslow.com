import type { APIRoute } from "astro";
import { requireAdminMutation } from "../../../lib/adminAuth";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { sanitizeNextPath } from "../../../lib/safeRedirect";

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminMutation(context);
  if (denied) return denied;

  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
  }

  const form = await context.request.formData();
  const userId = String(form.get("userId") ?? "");
  const redirectTo = sanitizeNextPath(String(form.get("redirectTo") ?? ""), "/admin/users");
  if (!userId) {
    return new Response(JSON.stringify({ error: "userId required" }), { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const stripe = getStripe();
  if (!admin || !stripe) {
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });
  }

  const { data: subRow } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subRow?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(subRow.stripe_subscription_id);
    } catch {
      // Already canceled/nonexistent on Stripe's side - fall through and
      // still reflect the canceled status locally.
    }
  }

  await admin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return context.redirect(`${redirectTo}?canceled=1`);
};
