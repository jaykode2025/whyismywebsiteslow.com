import { createServerClient } from "@supabase/ssr";
import { parse as parseCookie } from "cookie";
import type { AstroCookies } from "astro";
import { env, hasSupabaseEnv } from "../env";

function getAllCookies(request: Request) {
  const header = request.headers.get("cookie");
  if (!header) return [];
  const parsed = parseCookie(header);
  return Object.entries(parsed)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, value]) => ({ name, value }));
}

export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  const url = env.SUPABASE_URL();
  const key = env.SUPABASE_ANON_KEY();
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return getAllCookies(request);
      },
      setAll(cookieList) {
        cookieList.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function getUserFromLocalsOrCookies(
  locals: App.Locals,
  cookies: AstroCookies,
  request: Request
) {
  if (!hasSupabaseEnv()) return { supabase: null, user: null };
  const supabase = locals.supabase ?? createSupabaseServerClient(cookies, request);
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data?.user ?? null };
}
