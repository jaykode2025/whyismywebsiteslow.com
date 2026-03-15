import type { APIRoute } from "astro";
import type { Report } from "../../../lib/types";
import { hasLeadAccess, LEAD_ACCESS_COOKIE_NAME } from "../../../lib/leadAccess";
import { loadStoredReport } from "../../../lib/reports";
import { isReportUnlocked } from "../../../lib/entitlements";

function toPreview(report: Report) {
  return {
    id: report.id,
    createdAt: report.createdAt,
    url: report.url,
    canonicalHost: report.canonicalHost,
    device: report.device,
    visibility: report.visibility,
    summary: report.summary,
    psi: {
      source: report.psi.source,
      message: report.psi.message,
      cwv: {
        lcp_ms: report.psi.cwv.lcp_ms,
        status: report.psi.cwv.status,
      },
    },
  };
}

function toLeadGatePreview(report: Report) {
  return {
    id: report.id,
    createdAt: report.createdAt,
    url: report.url,
    canonicalHost: report.canonicalHost,
    device: report.device,
    visibility: report.visibility,
  };
}

export const GET: APIRoute = async (context) => {
  const id = context.params.id ?? "";
  const stored = await loadStoredReport(id, context.locals);

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

  const unlocked = await isReportUnlocked(id, context.locals);
  const leadAccessRaw = context.cookies.get(LEAD_ACCESS_COOKIE_NAME)?.value;
  const previewAccess = hasLeadAccess(leadAccessRaw, id);
  if (!unlocked) {
    if (!previewAccess) {
      return new Response(
        JSON.stringify({
          status: "done",
          locked: true,
          requiresLead: true,
          preview: toLeadGatePreview(stored.report),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ status: "done", locked: true, requiresLead: false, preview: toPreview(stored.report) }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ status: "done", locked: false, report: stored.report }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
