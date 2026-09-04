import type { APIRoute } from "astro";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

// Deletes the account. DB cleanup is handled by existing FK constraints:
// projects/subscriptions cascade-delete with the auth.users row; scans keep
// existing (report content stays reachable via its share link, user_id is
// set to NULL) - matches the per-report, not per-user, entitlement model
// used everywhere else in the app (see PROJECT_AUDIT.md).
export const POST: APIRoute = async (context) => {
  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return context.redirect("/account?error=" + encodeURIComponent("Session expired, please try again."));
  }

  const supabase = context.locals.supabase;
  if (!supabase) {
    return context.redirect("/account?error=" + encodeURIComponent("Not configured."));
  }

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    return context.redirect("/login?next=%2Faccount");
  }

  const form = await context.request.formData();
  const confirmation = String(form.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "DELETE") {
    return context.redirect("/account?error=" + encodeURIComponent('Type "DELETE" to confirm.'));
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return context.redirect("/account?error=" + encodeURIComponent("Not configured."));
  }

  // Best-effort: cancel any active Stripe subscription so a deleted account
  // doesn't keep getting billed. Not fatal if this fails (e.g. already
  // canceled) - the account deletion below still proceeds.
  const stripe = getStripe();
  if (stripe) {
    const { data: subRow } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subRow?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(subRow.stripe_subscription_id);
      } catch {
        // Ignore - subscription may already be canceled/nonexistent.
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return context.redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  return context.redirect("/?accountDeleted=1");
};
