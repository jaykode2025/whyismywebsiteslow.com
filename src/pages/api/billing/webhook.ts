import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { unlockReport } from "../../../lib/entitlements";
import { trackEvent, updateScanFactStatus } from "../../../lib/analytics";
import { sendReportPurchasedEmail } from "../../../lib/revenueEmails";

function toIso(ts: number | null | undefined) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const secret = env.STRIPE_WEBHOOK_SECRET();
  if (!stripe || !secret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Supabase admin not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Webhook Error", message: err.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Idempotency: skip if we already processed this event (e.g. Stripe retry).
  const { error: insertError } = await admin
    .from("stripe_webhook_events")
    .insert({ event_id: event.id });
  if (insertError) {
    const isDuplicate = (insertError as any)?.code === "23505";
    if (isDuplicate) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Stripe webhook idempotency insert failed:", insertError);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // We primarily care about subscription lifecycle.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as any;
    const userId = sub?.metadata?.user_id as string | undefined;
    const customerId = sub?.customer as string | undefined;
    const subscriptionId = sub?.id as string | undefined;
    const status = sub?.status as string | undefined;
    const priceId = sub?.items?.data?.[0]?.price?.id as string | undefined;

    if (userId) {
      const plan =
        priceId && env.STRIPE_PRICE_PRO() && priceId === env.STRIPE_PRICE_PRO()
          ? "pro"
          : priceId && env.STRIPE_PRICE_AGENCY() && priceId === env.STRIPE_PRICE_AGENCY()
            ? "agency"
            : "free";

      await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        price_id: priceId ?? null,
        plan,
        status: status ?? "inactive",
        current_period_end: toIso(sub?.current_period_end),
        updated_at: new Date().toISOString(),
      });

      if (status === "active" || status === "trialing") {
        await trackEvent(
          {
            eventType: "subscription_activated",
            userId,
            source: "stripe-webhook",
            offerContext: sub?.metadata?.offer_context ?? "billing",
            ctaVariant: sub?.metadata?.cta_variant ?? "primary",
            metadata: {
              plan,
              status,
              subscriptionId,
            },
          },
          admin
        );
        await trackEvent(
          {
            eventType: "subscription_started",
            userId,
            source: "stripe-webhook",
            offerContext: sub?.metadata?.offer_context ?? "billing",
            ctaVariant: sub?.metadata?.cta_variant ?? "primary",
            metadata: {
              plan,
              status,
              subscriptionId,
            },
          },
          admin
        );
        await trackEvent(
          {
            eventType: "purchase_completed",
            userId,
            source: "stripe-webhook",
            offerContext: sub?.metadata?.offer_context ?? "billing",
            ctaVariant: sub?.metadata?.cta_variant ?? "primary",
            metadata: {
              plan,
              status,
              subscriptionId,
              purchaseType: "subscription",
            },
          },
          admin
        );
      }
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    if (session?.mode === "payment" && session?.payment_status === "paid") {
      const reportId = session?.metadata?.report_id as string | undefined;
      if (reportId) {
        await unlockReport(reportId, session.id, { supabase: admin });
        await updateScanFactStatus(reportId, { unlockStatus: "purchased" }, admin);
        const { data: scan } = await admin.from("scans").select("report_json").eq("id", reportId).maybeSingle();
        const buyerEmail =
          (session?.customer_details?.email as string | undefined) ??
          (session?.customer_email as string | undefined) ??
          null;
        if (buyerEmail) {
          await sendReportPurchasedEmail({
            to: buyerEmail,
            report: (scan?.report_json as any) ?? null,
            reportId,
            origin: env.APP_BASE_URL() ?? "https://www.whyismywebsiteslow.com",
          });
        }
        await trackEvent(
          {
            eventType: "report_purchased",
            scanId: reportId,
            reportId,
            source: "stripe-webhook",
            email: buyerEmail,
            offerContext: session?.metadata?.offer_context ?? "report",
            ctaVariant: session?.metadata?.cta_variant ?? "primary",
            metadata: {
              sessionId: session.id,
            },
          },
          admin
        );
        await trackEvent(
          {
            eventType: "purchase_completed",
            scanId: reportId,
            reportId,
            source: "stripe-webhook",
            email: buyerEmail,
            offerContext: session?.metadata?.offer_context ?? "report",
            ctaVariant: session?.metadata?.cta_variant ?? "primary",
            metadata: {
              sessionId: session.id,
              purchaseType: "report-unlock",
            },
          },
          admin
        );
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
