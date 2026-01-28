import type { APIRoute } from "astro";
import { deleteReport, getReport } from "../../../../lib/store";
import { hashToken } from "../../../../lib/store";

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  const body = await request.json().catch(() => ({}));
  const token = body.manageToken as string | undefined;

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing manage token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stored = getReport(id);
  if (!stored?.report) {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokenHash = hashToken(token);
  if (stored.report.manage.writeTokenHash !== tokenHash) {
    return new Response(JSON.stringify({ error: "Invalid manage token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  deleteReport(id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
