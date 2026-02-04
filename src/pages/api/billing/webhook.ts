import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { unlockReport } from "../../../lib/entitlements";

function toIso(ts: number | null | undefined) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const secret = env.STRIPE_WEBHOOK_SECRET();
  if (!stripe || !secret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response("Supabase admin not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
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
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    if (session?.mode === "payment" && session?.payment_status === "paid") {
      const reportId = session?.metadata?.report_id as string | undefined;
      if (reportId) {
        await unlockReport(reportId, session.id, { supabase: admin });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
