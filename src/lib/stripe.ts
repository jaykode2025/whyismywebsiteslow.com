import Stripe from "stripe";
import { env } from "./env";

export function getStripe() {
  const key = env.STRIPE_SECRET_KEY();
  if (!key) return null;
  return new Stripe(key, {
    // Keep this reasonably current; Stripe will warn if too old.
    apiVersion: "2024-06-20",
  });
}

