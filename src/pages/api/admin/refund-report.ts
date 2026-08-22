import type { APIRoute } from "astro";
import { requireAdminApi } from "../../../lib/adminAuth";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { lockReport } from "../../../lib/entitlements";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
  }

  const form = await context.request.formData();
  const reportId = String(form.get("reportId") ?? "");
  if (!reportId) {
    return new Response(JSON.stringify({ error: "reportId required" }), { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const stripe = getStripe();
  if (!admin || !stripe) {
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });
  }

  const { data: entitlement } = await admin
    .from("report_entitlements")
    .select("stripe_session_id")
    .eq("report_id", reportId)
    .maybeSingle();

  let refundError: string | null = null;
  if (entitlement?.stripe_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(entitlement.stripe_session_id);
      const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (paymentIntent) {
        await stripe.refunds.create({ payment_intent: paymentIntent });
      } else {
        refundError = "No payment to refund on this checkout session.";
      }
    } catch (err: any) {
      refundError = err?.message ?? "Refund failed.";
    }
  } else {
    refundError = "No Stripe checkout session on file for this report.";
  }

  // Lock the report regardless of whether the Stripe refund itself
  // succeeded (e.g. it may have already been refunded manually) - the admin
  // explicitly asked to revoke access.
  await lockReport(reportId, { supabase: admin });

  const suffix = refundError ? `&refundError=${encodeURIComponent(refundError)}` : "&refunded=1";
  return context.redirect(`/admin/reports?id=${encodeURIComponent(reportId)}${suffix}`);
};
