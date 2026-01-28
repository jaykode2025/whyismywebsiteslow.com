import type { APIRoute } from "astro";
import { getReport } from "../../../lib/store";

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  const stored = getReport(id);

  if (!stored) {
    return new Response(JSON.stringify({ status: "failed", error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (stored.status !== "done" || !stored.report) {
    return new Response(JSON.stringify({ status: stored.status, error: stored.error }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { manage, ...publicReport } = stored.report;

  return new Response(JSON.stringify({ status: "done", report: publicReport }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
