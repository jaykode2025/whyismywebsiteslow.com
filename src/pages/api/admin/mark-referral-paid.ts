import type { APIRoute } from "astro";
import { requireAdminMutation } from "../../../lib/adminAuth";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminMutation(context);
  if (denied) return denied;

  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
  }

  const form = await context.request.formData();
  const referralId = String(form.get("referralId") ?? "");
  if (!referralId) {
    return new Response(JSON.stringify({ error: "referralId required" }), { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Supabase admin not configured" }), { status: 500 });
  }

  await admin
    .from("affiliate_referrals")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", referralId);

  return context.redirect(`/admin/affiliates?paid=1`);
};
