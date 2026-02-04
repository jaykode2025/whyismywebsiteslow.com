import type { APIRoute } from "astro";
import { requireUser } from "../../../lib/auth";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const required = await requireUser(context);
  if (required instanceof Response) return required;

  const stripe = getStripe();
  if (!stripe) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pricePro = env.STRIPE_PRICE_PRO();
  if (!pricePro) {
    return new Response(JSON.stringify({ error: "STRIPE_PRICE_PRO not set" }), {
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
    line_items: [{ price: pricePro, quantity: 1 }],
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
    client_reference_id: required.user.id,
    subscription_data: {
      metadata: { user_id: required.user.id },
    },
  });

  if (!session.url) {
    return new Response(JSON.stringify({ error: "Missing checkout URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return context.redirect(session.url);
};
