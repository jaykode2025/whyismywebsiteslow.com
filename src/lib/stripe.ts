import Stripe from "stripe";
import { env } from "./env";

export function getStripe() {
  const key = env.STRIPE_SECRET_KEY();
  if (!key) return null;
  return new Stripe(key, {
    // @ts-ignore - Stripe types can be strict about version strings
    apiVersion: "2026-04-22.dahlia",
  });
}
