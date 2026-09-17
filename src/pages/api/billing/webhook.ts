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

/**
 * Drop the idempotency marker so a Stripe retry is allowed to reprocess this
 * event. Without this a transient failure would be permanently swallowed: the
 * marker row survives, the retry short-circuits as a duplicate, and the
 * customer never receives what they paid for.
 */
async function releaseEvent(admin: any, eventId: string) {
  const { error } = await admin.from("stripe_webhook_events").delete().eq("event_id", eventId);
  if (error) console.error("Stripe webhook: failed to release event marker", eventId, error);
}

function getPlanFromPriceId(priceId: string | undefined) {
  if (!priceId) return "free";
  if (
    (env.STRIPE_PRICE_PRO() && priceId === env.STRIPE_PRICE_PRO()) ||
    (env.STRIPE_PRICE_PRO_YEARLY() && priceId === env.STRIPE_PRICE_PRO_YEARLY())
  ) {
    return "pro";
  }
  if (env.STRIPE_PRICE_AGENCY() && priceId === env.STRIPE_PRICE_AGENCY()) {
    return "agency";
  }
  return "free";
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

  try {
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
      const item = sub?.items?.data?.[0];
      const priceId = item?.price?.id as string | undefined;
      // As of Stripe API 2025-03+ / node-stripe v20, current_period_end lives on the
      // subscription *item*, not the subscription. Fall back for older payloads.
      const periodEnd = (item?.current_period_end ?? sub?.current_period_end) as number | undefined;

      if (userId) {
        // A deleted subscription keeps its paid price id, so derive the plan from
        // the event type rather than the price alone - otherwise canceled
        // customers keep paid entitlements forever.
        const plan =
          event.type === "customer.subscription.deleted" ? "free" : getPlanFromPriceId(priceId);

        const { error: upsertError } = await admin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          price_id: priceId ?? null,
          plan,
          status: event.type === "customer.subscription.deleted" ? "canceled" : status ?? "inactive",
          current_period_end: toIso(periodEnd),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Stripe webhook: subscription upsert failed", upsertError);
          await releaseEvent(admin, event.id);
          return new Response(JSON.stringify({ error: "Subscription sync failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

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
  } catch (err) {
    // Any unexpected failure must release the idempotency marker, otherwise
    // Stripe's retry is rejected as a duplicate and the purchase is lost.
    console.error("Stripe webhook: unhandled processing error", event.id, event.type, err);
    await releaseEvent(admin, event.id);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
