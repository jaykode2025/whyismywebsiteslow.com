import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { rateLimit } from "../../../lib/slidingRateLimit";

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const ip = context.clientAddress ?? "unknown";
  // Reuse the existing scan rate limiter's bucket shape to throttle abuse
  // (this endpoint sends an email per request, so it's spammable/enumerable).
  const bucket = rateLimit(`forgot-password:${ip}`);
  if (!bucket.ok) {
    return context.redirect("/forgot-password?sent=1");
  }

  const form = await context.request.formData();
  const email = String(form.get("email") ?? "").trim();

  if (supabase && email) {
    const baseUrl = env.APP_BASE_URL() ?? new URL(context.request.url).origin;
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    });
  }

  // Always show the same "check your email" result whether or not the
  // address exists, the request was rate-limited, or Supabase isn't
  // configured - never reveal whether an account exists for this email.
  return context.redirect("/forgot-password?sent=1");
};
