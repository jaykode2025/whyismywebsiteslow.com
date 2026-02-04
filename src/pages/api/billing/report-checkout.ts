import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";
import { loadStoredReport } from "../../../lib/reports";
import { isReportUnlocked } from "../../../lib/entitlements";

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
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = env.APP_BASE_URL() ?? new URL(context.request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 1900,
          product_data: { name: "Full Performance Report" },
        },
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
