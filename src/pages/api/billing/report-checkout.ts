import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";
import { loadStoredReport } from "../../../lib/reports";
import { isReportUnlocked } from "../../../lib/entitlements";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";

async function readReportId(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return String((body as any).reportId ?? (body as any).report_id ?? "");
  }
  const form = await request.formData();
  return String(form.get("reportId") ?? form.get("report_id") ?? "");
}

export const POST: APIRoute = async (context) => {
  // Verify CSRF token for non-GET requests
  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const reportId = await readReportId(context.request);
  if (!reportId) {
    return new Response(JSON.stringify({ error: "reportId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stored = await loadStoredReport(reportId, context.locals);
  if (!stored || stored.status !== "done") {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const alreadyUnlocked = await isReportUnlocked(reportId, context.locals);
  if (alreadyUnlocked) {
    return context.redirect(`/report/${reportId}`);
  }

  const stripe = getStripe();
  if (!stripe) {
    console.error("Stripe not configured properly");
    return new Response(JSON.stringify({ error: "Payment processing unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = env.APP_BASE_URL() ?? new URL(context.request.url).origin;

  const priceId = env.STRIPE_PRICE_REPORT_UNLOCK();
  if (!priceId) {
    return new Response(JSON.stringify({ error: "Payment configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/api/billing/report-verify?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/report/${reportId}`,
    metadata: { report_id: reportId },
    client_reference_id: reportId,
  });

  if (!session.url) {
    return new Response(JSON.stringify({ error: "Missing checkout URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return context.redirect(session.url);
};
