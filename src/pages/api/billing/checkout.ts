import type { APIRoute } from "astro";
import { requireUser } from "../../../lib/auth";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { trackEvent } from "../../../lib/analytics";

async function readBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      plan: String((body as any).plan ?? "pro"),
      offerContext: String((body as any).offerContext ?? (body as any).offer_context ?? ""),
      ctaVariant: String((body as any).ctaVariant ?? (body as any).cta_variant ?? ""),
    };
  }
  const form = await request.formData();
  return {
    plan: String(form.get("plan") ?? "pro"),
    offerContext: String(form.get("offerContext") ?? form.get("offer_context") ?? ""),
    ctaVariant: String(form.get("ctaVariant") ?? form.get("cta_variant") ?? ""),
  };
}

export const POST: APIRoute = async (context) => {
  const required = await requireUser(context);
  if (required instanceof Response) return required;

  const { plan, offerContext, ctaVariant } = await readBody(context.request);
  if (!["pro", "agency", "pro-yearly"].includes(plan)) {
    return new Response(JSON.stringify({ error: "Invalid plan" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let priceId: string | undefined;
  if (plan === "pro") {
    priceId = env.STRIPE_PRICE_PRO();
  } else if (plan === "agency") {
    priceId = env.STRIPE_PRICE_AGENCY();
  } else if (plan === "pro-yearly") {
    priceId = env.STRIPE_PRICE_PRO_YEARLY();
  }

  if (!priceId) {
    return new Response(JSON.stringify({ error: `STRIPE_PRICE_${plan.toUpperCase()} not set` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = env.APP_BASE_URL() ?? new URL(context.request.url).origin;

  // Get existing customer id if present
  const { data: subRow } = await required.supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", required.user.id)
    .maybeSingle();

  let customerId = subRow?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: required.user.email ?? undefined,
      metadata: { user_id: required.user.id },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .upsert({ user_id: required.user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
    client_reference_id: required.user.id,
    subscription_data: {
      metadata: {
        user_id: required.user.id,
        plan_type: plan,
        offer_context: offerContext || "billing",
        cta_variant: ctaVariant || "primary",
      },
    },
  });

  if (!session.url) {
    return new Response(JSON.stringify({ error: "Missing checkout URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await trackEvent(
    {
      eventType: "subscription_checkout_started",
      userId: required.user.id,
      source: "billing-checkout",
      offerContext: offerContext || "billing",
      ctaVariant: ctaVariant || "primary",
      referrer: context.request.headers.get("referer"),
      userAgent: context.request.headers.get("user-agent"),
      path: new URL(context.request.url).pathname,
      metadata: {
        plan,
      },
    },
    admin
  );
  await trackEvent(
    {
      eventType: "checkout_started",
      userId: required.user.id,
      source: "billing-checkout",
      offerContext: offerContext || "billing",
      ctaVariant: ctaVariant || "primary",
      referrer: context.request.headers.get("referer"),
      userAgent: context.request.headers.get("user-agent"),
      path: new URL(context.request.url).pathname,
      metadata: {
        plan,
        checkoutType: "subscription",
      },
    },
    admin
  );

  return context.redirect(session.url);
};
