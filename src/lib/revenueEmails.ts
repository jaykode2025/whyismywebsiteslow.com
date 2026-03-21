import type { Report } from "./types";
import { env } from "./env";
import { sendAlertEmail } from "./alerts";
import type { ServiceLead } from "./serviceLeads";

function appBaseUrl(fallbackOrigin: string) {
  return env.APP_BASE_URL() ?? fallbackOrigin;
}

function hostLabel(report?: Pick<Report, "canonicalHost"> | null) {
  return report?.canonicalHost ?? "your website";
}

function reportUrl(reportId: string | null | undefined, origin: string) {
  if (!reportId) return `${origin}/scan`;
  return `${origin}/report/${reportId}`;
}

function moneyLine(report?: Pick<Report, "businessImpact"> | null) {
  if (!report) return "Slow pages usually cost more than teams expect in lost attention, leads, and trust.";
  return `Current modeled revenue at risk: ${report.businessImpact.estimatedRange.revenueProtection}.`;
}

export async function sendPreviewUnlockedEmail(params: {
  to: string;
  report: Report | null;
  reportId?: string | null;
  origin: string;
  isReminder?: boolean;
}) {
  const baseUrl = appBaseUrl(params.origin);
  const url = reportUrl(params.reportId ?? params.report?.id, baseUrl);
  const subject = params.isReminder
    ? `Your website speed report is still waiting`
    : `Your free website speed report is ready`;
  const host = hostLabel(params.report);
  const topIssue = params.report?.summary.topIssues?.[0] ?? "the main bottleneck";
  const risk = params.report?.businessImpact.headline ?? "Your site may be losing revenue because it feels slower than it should.";

  return sendAlertEmail({
    to: params.to,
    subject,
    replyTo: env.SUPPORT_REPLY_TO() ?? null,
    text: [
      `Your report for ${host} is ready: ${url}`,
      risk,
      moneyLine(params.report),
      `Top issue: ${topIssue}.`,
      `Open the report, review the free diagnosis, then decide whether to unlock the detailed fix plan or ask for hands-on help.`,
    ].join("\n"),
    html: `
      <p>Your report for <strong>${host}</strong> is ready.</p>
      <p><a href="${url}">Open your report</a></p>
      <p>${risk}</p>
      <p>${moneyLine(params.report)}</p>
      <p><strong>Top issue:</strong> ${topIssue}</p>
      <p>The free version gives the diagnosis. The paid unlock gives the full fix sequence. If you want help implementing it, reply and ask about done-for-you optimization.</p>
    `,
  });
}

export async function sendReportPurchasedEmail(params: {
  to: string;
  report: Report | null;
  reportId: string;
  origin: string;
}) {
  const baseUrl = appBaseUrl(params.origin);
  const url = reportUrl(params.reportId, baseUrl);
  const billingUrl = `${baseUrl}/billing`;
  const fixItUrl = `${baseUrl}/fix-it?reportId=${params.reportId}`;

  return sendAlertEmail({
    to: params.to,
    subject: `Your full speed report is unlocked`,
    replyTo: env.SUPPORT_REPLY_TO() ?? null,
    text: [
      `Your full report is unlocked: ${url}`,
      moneyLine(params.report),
      `Next step 1: review the full fix list.`,
      `Next step 2: if you want continuous protection, monitoring is here: ${billingUrl}`,
      `Next step 3: if you want the work handled for you, request help here: ${fixItUrl}`,
    ].join("\n"),
    html: `
      <p>Your full report is unlocked.</p>
      <p><a href="${url}">Open the full report</a></p>
      <p>${moneyLine(params.report)}</p>
      <ul>
        <li>Review the full fix list and priority order.</li>
        <li><a href="${billingUrl}">Start monitoring</a> if you want ongoing regression protection.</li>
        <li><a href="${fixItUrl}">Request fix-it help</a> if you want implementation support.</li>
      </ul>
    `,
  });
}

export async function sendServiceLeadConfirmation(params: {
  lead: ServiceLead;
  origin: string;
}) {
  const baseUrl = appBaseUrl(params.origin);
  const scanUrl = `${baseUrl}/scan`;

  return sendAlertEmail({
    to: params.lead.email,
    subject: `We received your website performance request`,
    replyTo: env.SUPPORT_REPLY_TO() ?? null,
    text: [
      `We received your request for performance help.`,
      params.lead.websiteUrl ? `Website: ${params.lead.websiteUrl}` : null,
      `We will follow up with scope and next steps.`,
      `If you want to run another scan in the meantime: ${scanUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p>We received your request for performance help.</p>
      ${params.lead.websiteUrl ? `<p><strong>Website:</strong> ${params.lead.websiteUrl}</p>` : ""}
      <p>We will follow up with scope and next steps.</p>
      <p>If you want to run another scan in the meantime, <a href="${scanUrl}">start here</a>.</p>
    `,
  });
}

export async function sendServiceLeadNotification(params: {
  lead: ServiceLead;
  origin: string;
}) {
  const notifyTo = env.SALES_NOTIFY_EMAIL() || env.ALERT_FROM_EMAIL();
  if (!notifyTo) return { ok: false as const, reason: "missing_config" as const };

  const baseUrl = appBaseUrl(params.origin);
  const reportLink = params.lead.reportId ? `${baseUrl}/report/${params.lead.reportId}` : null;

  return sendAlertEmail({
    to: notifyTo,
    subject: `New fix-it lead: ${params.lead.websiteUrl ?? params.lead.email}`,
    replyTo: params.lead.email,
    text: [
      `New service lead from ${params.lead.email}`,
      params.lead.websiteUrl ? `Website: ${params.lead.websiteUrl}` : null,
      params.lead.reportId ? `Report: ${reportLink}` : null,
      params.lead.notes ? `Notes: ${params.lead.notes}` : null,
      `Source: ${params.lead.source}`,
      `Offer context: ${params.lead.offerContext ?? "-"}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p><strong>New service lead</strong></p>
      <p>Email: ${params.lead.email}</p>
      ${params.lead.websiteUrl ? `<p>Website: ${params.lead.websiteUrl}</p>` : ""}
      ${params.lead.reportId ? `<p>Report: <a href="${reportLink}">${reportLink}</a></p>` : ""}
      ${params.lead.notes ? `<p>Notes: ${params.lead.notes}</p>` : ""}
      <p>Source: ${params.lead.source}</p>
      <p>Offer context: ${params.lead.offerContext ?? "-"}</p>
    `,
  });
}
