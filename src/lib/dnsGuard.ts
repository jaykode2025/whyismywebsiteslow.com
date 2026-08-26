import dns from "node:dns";
import { isBlockedHostname } from "./validate";

/**
 * Resolves a hostname and rejects if any address it resolves to is
 * internal/private. `isBlockedHostname()` alone only catches IP-literal SSRF
 * attempts (`http://127.0.0.1/`) and a handful of known-internal hostname
 * suffixes (`.internal`, `.local`, ...) - it never actually resolves an
 * arbitrary domain name. That meant `attacker-controlled.com` with an A/AAAA
 * record pointing straight at `169.254.169.254` (or any other private
 * address) sailed through both submission-time validation and every
 * redirect-hop check untouched, since those only ever inspected the hostname
 * string, not where it actually points.
 *
 * This closes that gap for the common case: a domain that already resolves
 * to a private address at lookup time. It does NOT fully close DNS-rebinding
 * in the stricter sense - a domain with a near-zero TTL that changes IP in
 * the moment between this lookup and the fetch layer's actual TCP connect
 * could still slip through, since Node's fetch does its own DNS resolution
 * independently of this check. Closing that fully needs a DNS-pinned fetch
 * dispatcher (an undici Agent with a custom `lookup`/`connect` override that
 * reuses exactly the address validated here) - a larger, more invasive change
 * left for a dedicated pass rather than bundled into this one.
 */
export async function assertResolvesToPublicAddress(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) {
    throw new Error("Internal URLs not allowed");
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    // Unresolvable host - let the caller's own fetch fail naturally with a
    // clearer network/DNS error rather than masking it as "blocked".
    return;
  }

  for (const { address } of addresses) {
    if (isBlockedHostname(address)) {
      throw new Error("Internal URLs not allowed");
    }
  }
}
