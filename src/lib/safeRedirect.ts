/**
 * Guards against open-redirect via a user-controlled "next"/"redirectTo"
 * form field: only allows same-site absolute paths, never a protocol-relative
 * or backslash-prefixed value that browsers can interpret as an external URL.
 *
 * (Previously duplicated with slightly different logic in login.ts,
 * signup.ts, and leads/preview.ts - consolidated here.)
 */
export function sanitizeNextPath(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  return trimmed;
}
