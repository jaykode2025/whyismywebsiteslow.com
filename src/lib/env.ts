// Vite requires static property access to import.meta.env (no dynamic access)
const getEnv = (key: string) => {
  if (typeof import.meta === "undefined" || !import.meta.env) {
    return undefined;
  }
  return (import.meta.env as any)[key];
};

export const env = {
  // Optional: set if you have a custom Chrome/Chromium path
  CHROME_EXECUTABLE_PATH: () => getEnv("CHROME_EXECUTABLE_PATH"),

  SUPABASE_URL: () => getEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: () => getEnv("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: () => getEnv("SUPABASE_SERVICE_ROLE_KEY"),

  STRIPE_SECRET_KEY: () => getEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: () => getEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_PRO: () => getEnv("STRIPE_PRICE_PRO"),
  STRIPE_PRICE_PRO_YEARLY: () => getEnv("STRIPE_PRICE_PRO_YEARLY"),
  STRIPE_PRICE_AGENCY: () => getEnv("STRIPE_PRICE_AGENCY"),
  STRIPE_PRICE_REPORT_UNLOCK: () => getEnv("STRIPE_PRICE_REPORT_UNLOCK"),

  QSTASH_TOKEN: () => getEnv("QSTASH_TOKEN"),
  APP_BASE_URL: () => getEnv("APP_BASE_URL"),

  /** Optional: Google PageSpeed Insights API key for higher rate limits */
  PSI_API_KEY: () => getEnv("PSI_API_KEY"),

  RESEND_API_KEY: () => getEnv("RESEND_API_KEY"),
  ALERT_FROM_EMAIL: () => getEnv("ALERT_FROM_EMAIL"),
  SALES_NOTIFY_EMAIL: () => getEnv("SALES_NOTIFY_EMAIL"),
  SUPPORT_REPLY_TO: () => getEnv("SUPPORT_REPLY_TO"),
  INTERNAL_DASHBOARD_KEY: () => getEnv("INTERNAL_DASHBOARD_KEY"),
};

export function hasSupabaseEnv() {
  return Boolean(env.SUPABASE_URL() && env.SUPABASE_ANON_KEY());
}
