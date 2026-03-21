import { env } from "./env";

type EnqueueOptions = {
  workerUrl: string;
  body: unknown;
  delay?: string;
};

/**
 * Enqueue a job to QStash. We use QSTASH_TOKEN to publish and also forward an Authorization header
 * to the worker for simple validation.
 *
 * NOTE: For stronger guarantees, switch to signature verification (Upstash signing keys) when available.
 */
export async function enqueueQStashJob({ workerUrl, body, delay }: EnqueueOptions) {
  const token = env.QSTASH_TOKEN();
  if (!token) throw new Error("QSTASH_TOKEN not set");

  const publishUrl = `https://qstash.upstash.io/v2/publish/${encodeURIComponent(workerUrl)}`;
  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Forward a token to the worker so it can validate this came from QStash.
      "Upstash-Forward-Authorization": `Bearer ${token}`,
      ...(delay ? { "Upstash-Delay": delay } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`QStash publish failed (${res.status}): ${text}`);
  }

  return res.json().catch(() => ({}));
}
