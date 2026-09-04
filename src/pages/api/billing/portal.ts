import type { APIRoute } from "astro";
import { requireUser } from "../../../lib/auth";
import { env } from "../../../lib/env";
import { getStripe } from "../../../lib/stripe";

// Lets a subscriber manage/cancel their own subscription and see invoices
// via Stripe's hosted portal, instead of needing support to do it for them.
export const POST: APIRoute = async (context) => {
  const required = await requireUser(context);
  if (required instanceof Response) return required;

  const stripe = getStripe();
  if (!stripe) {
    return context.redirect("/account?error=" + encodeURIComponent("Billing isn't configured."));
  }

  const { data: subRow } = await required.supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", required.user.id)
    .maybeSingle();

  const customerId = subRow?.stripe_customer_id;
  if (!customerId) {
    // No Stripe customer yet - nothing to manage, send them to upgrade instead.
    return context.redirect("/billing");
  }

  const baseUrl = env.APP_BASE_URL() ?? new URL(context.request.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/account`,
  });

  return context.redirect(session.url);
};
