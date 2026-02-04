import type { APIRoute } from "astro";
import { getStripe } from "../../../lib/stripe";
import { unlockReport } from "../../../lib/entitlements";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const GET: APIRoute = async (context) => {
  const sessionId = context.url.searchParams.get("session_id") ?? "";
  if (!sessionId) {
    return new Response("Missing session_id", { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const reportId = session.metadata?.report_id ?? session.client_reference_id ?? "";
  if (!reportId) {
    return new Response("Missing report_id", { status: 400 });
  }

  if (session.mode === "payment" && session.payment_status === "paid") {
    const admin = createSupabaseAdminClient();
    if (admin) {
      await unlockReport(reportId, session.id, { supabase: admin });
    } else {
      await unlockReport(reportId, session.id);
    }
  }

  return context.redirect(`/report/${reportId}?unlocked=1`);
};
