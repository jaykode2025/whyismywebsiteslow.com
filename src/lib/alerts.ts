import { env } from "./env";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; reason: "missing_config" | "provider_error"; details?: string };

export async function sendAlertEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const apiKey = env.RESEND_API_KEY();
  const from = env.ALERT_FROM_EMAIL();
  if (!apiKey || !from) {
    return { ok: false, reason: "missing_config" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: payload.replyTo ?? undefined,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return { ok: false, reason: "provider_error", details };
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: body.id };
}
