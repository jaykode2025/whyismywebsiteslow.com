import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

export function createSupabaseAdminClient() {
  const url = env.SUPABASE_URL();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY();
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

