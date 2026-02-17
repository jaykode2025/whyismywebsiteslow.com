import { randomBytes, timingSafeEqual } from "node:crypto";
import { parse as parseCookie } from "cookie";
import type { AstroCookies } from "astro";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_TOKEN_LENGTH = 32;
const CSRF_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

function isValidToken(value: unknown): value is string {
  return typeof value === "string" && value.length === CSRF_TOKEN_LENGTH * 2;
}

function tokenFromRequestCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const parsed = parseCookie(cookieHeader);
  const token = parsed[CSRF_COOKIE_NAME];
  return isValidToken(token) ? token : null;
}

function safeTokenEqual(a: string, b: string): boolean {
  if (!isValidToken(a) || !isValidToken(b)) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function ensureCsrfToken(cookies: AstroCookies, request: Request): string {
  const existing = cookies.get(CSRF_COOKIE_NAME)?.value ?? tokenFromRequestCookie(request);
  const token = isValidToken(existing) ? existing : generateCsrfToken();

  if (!isValidToken(existing)) {
    const secure = (() => {
      try {
        return new URL(request.url).protocol === "https:";
      } catch {
        return false;
      }
    })();

    cookies.set(CSRF_COOKIE_NAME, token, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure,
      maxAge: CSRF_MAX_AGE_SECONDS,
    });
  }

  return token;
}

export async function verifyCsrfTokenFromRequest(request: Request): Promise<boolean> {
  const cookieToken = tokenFromRequestCookie(request);
  if (!cookieToken) return false;

  const contentType = request.headers.get("content-type") || "";
  let requestToken: string | null = null;

  if (contentType.includes("application/json")) {
    requestToken = request.headers.get("X-CSRF-Token");
  } else {
    try {
      const formData = await request.clone().formData();
      const formToken = formData.get("_csrf");
      requestToken = typeof formToken === "string" ? formToken : null;
    } catch {
      requestToken = request.headers.get("X-CSRF-Token");
    }
  }

  if (!requestToken) return false;
  return safeTokenEqual(requestToken, cookieToken);
}
