import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for secrets (bearer tokens, manage-token
 * hashes) where a plain `!==` leaks timing information proportional to how
 * many leading characters match. Hashing both sides to a fixed-length
 * digest first means `timingSafeEqual` never throws on a length mismatch
 * (unlike comparing the raw strings/buffers directly) and the comparison
 * time doesn't depend on the secret's actual length or content.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
