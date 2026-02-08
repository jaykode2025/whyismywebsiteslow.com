// Vite requires static property access to import.meta.env (no dynamic access)
export const env = {
  // Optional: set if you have a custom Chrome/Chromium path
  CHROME_EXECUTABLE_PATH: () => import.meta.env.CHROME_EXECUTABLE_PATH,

  SUPABASE_URL: () => import.meta.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: () => import.meta.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: () => import.meta.env.SUPABASE_SERVICE_ROLE_KEY,

  STRIPE_SECRET_KEY: () => import.meta.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: () => import.meta.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PRO: () => import.meta.env.STRIPE_PRICE_PRO,
  STRIPE_PRICE_AGENCY: () => import.meta.env.STRIPE_PRICE_AGENCY,

  QSTASH_TOKEN: () => import.meta.env.QSTASH_TOKEN,
  APP_BASE_URL: () => import.meta.env.APP_BASE_URL,
};

export function hasSupabaseEnv() {
  return Boolean(env.SUPABASE_URL() && env.SUPABASE_ANON_KEY());
}
