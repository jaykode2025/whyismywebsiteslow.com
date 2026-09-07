// Environment variables are static and loaded at build time.
// Cache them in module scope to avoid repeated lookups.

const getEnv = (key: string) => {
  if (typeof import.meta === "undefined" || !import.meta.env) {
    return undefined;
  }
  return (import.meta.env as any)[key];
};

// Cache environment variables at module load time (not on each access)
const envCache = {
  CHROME_EXECUTABLE_PATH: getEnv("CHROME_EXECUTABLE_PATH"),
  SUPABASE_URL: getEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnv("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_PRO: getEnv("STRIPE_PRICE_PRO"),
  STRIPE_PRICE_PRO_YEARLY: getEnv("STRIPE_PRICE_PRO_YEARLY"),
  STRIPE_PRICE_AGENCY: getEnv("STRIPE_PRICE_AGENCY"),
  STRIPE_PRICE_REPORT_UNLOCK: getEnv("STRIPE_PRICE_REPORT_UNLOCK"),
  QSTASH_TOKEN: getEnv("QSTASH_TOKEN"),
  APP_BASE_URL: getEnv("APP_BASE_URL"),
  CRON_SECRET: getEnv("CRON_SECRET"),
  PSI_API_KEY: getEnv("PSI_API_KEY"),
  OPENAI_API_KEY: getEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: getEnv("OPENAI_MODEL") || "gpt-4o-mini",
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  ALERT_FROM_EMAIL: getEnv("ALERT_FROM_EMAIL"),
  SALES_NOTIFY_EMAIL: getEnv("SALES_NOTIFY_EMAIL"),
  SUPPORT_REPLY_TO: getEnv("SUPPORT_REPLY_TO"),
  INTERNAL_DASHBOARD_KEY: getEnv("INTERNAL_DASHBOARD_KEY"),
} as const;

export const env = {
  // Return cached values instead of looking them up each time
  CHROME_EXECUTABLE_PATH: () => envCache.CHROME_EXECUTABLE_PATH,
  SUPABASE_URL: () => envCache.SUPABASE_URL,
  SUPABASE_ANON_KEY: () => envCache.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: () => envCache.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: () => envCache.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: () => envCache.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PRO: () => envCache.STRIPE_PRICE_PRO,
  STRIPE_PRICE_PRO_YEARLY: () => envCache.STRIPE_PRICE_PRO_YEARLY,
  STRIPE_PRICE_AGENCY: () => envCache.STRIPE_PRICE_AGENCY,
  STRIPE_PRICE_REPORT_UNLOCK: () => envCache.STRIPE_PRICE_REPORT_UNLOCK,
  QSTASH_TOKEN: () => envCache.QSTASH_TOKEN,
  APP_BASE_URL: () => envCache.APP_BASE_URL,
  CRON_SECRET: () => envCache.CRON_SECRET,
  PSI_API_KEY: () => envCache.PSI_API_KEY,
  OPENAI_API_KEY: () => envCache.OPENAI_API_KEY,
  OPENAI_MODEL: () => envCache.OPENAI_MODEL,
  RESEND_API_KEY: () => envCache.RESEND_API_KEY,
  ALERT_FROM_EMAIL: () => envCache.ALERT_FROM_EMAIL,
  SALES_NOTIFY_EMAIL: () => envCache.SALES_NOTIFY_EMAIL,
  SUPPORT_REPLY_TO: () => envCache.SUPPORT_REPLY_TO,
  INTERNAL_DASHBOARD_KEY: () => envCache.INTERNAL_DASHBOARD_KEY,
};

export function hasSupabaseEnv() {
  return Boolean(env.SUPABASE_URL() && env.SUPABASE_ANON_KEY());
}
