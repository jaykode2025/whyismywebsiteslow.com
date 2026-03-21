import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { sendPreviewUnlockedEmail } from "../../../lib/revenueEmails";

type FollowUpPayload =
  | {
      kind: "preview-reminder";
      email: string;
      reportId: string;
    };

export const POST: APIRoute = async ({ request }) => {
  const expected = env.QSTASH_TOKEN();
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = (await request.json().catch(() => ({}))) as FollowUpPayload;
  if (payload.kind !== "preview-reminder" || !payload.email || !payload.reportId) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createSupabaseAdminClient();
  let report: any = null;
  let isUnlocked = false;

  if (admin) {
    const [{ data: entitlement }, { data: scan }] = await Promise.all([
      admin.from("report_entitlements").select("unlocked").eq("report_id", payload.reportId).maybeSingle(),
      admin.from("scans").select("report_json").eq("id", payload.reportId).maybeSingle(),
    ]);

    isUnlocked = Boolean(entitlement?.unlocked);
    report = (scan?.report_json as any) ?? null;
  }

  if (isUnlocked) {
    return new Response(JSON.stringify({ ok: true, skipped: "already_unlocked" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  await sendPreviewUnlockedEmail({
    to: payload.email,
    report,
    reportId: payload.reportId,
    origin: new URL(request.url).origin,
    isReminder: true,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
