import "server-only";
import { Resend } from "resend";
import type { Lead } from "@/db/schema";

let resend: Resend | null = null;
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export async function sendStaleDigest(opts: {
  to: string;
  leads: Pick<Lead, "id" | "customerName" | "igUsername" | "summary" | "lastInboundAt" | "createdAt">[];
  appUrl: string;
}) {
  const r = getResend();
  if (!r) {
    console.warn("[notifications] Resend not configured; skipping digest email.");
    return { skipped: true };
  }
  if (!opts.to) {
    console.warn("[notifications] No notification email configured; skipping.");
    return { skipped: true };
  }
  if (opts.leads.length === 0) return { skipped: true };

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Lush Wedding Hall <onboarding@resend.dev>";

  const subject = `${opts.leads.length} pending lead${opts.leads.length === 1 ? "" : "s"} need follow-up`;

  const rowsHtml = opts.leads
    .map(
      (l) =>
        `<tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:8px 12px"><a href="${opts.appUrl}/leads/${l.id}">${escape(l.customerName ?? l.igUsername ?? "Unknown lead")}</a></td>
          <td style="padding:8px 12px;color:#6b7280">${escape(l.summary ? truncate(l.summary, 90) : "")}</td>
          <td style="padding:8px 12px;color:#6b7280;font-size:12px">${escape(new Date(l.lastInboundAt ?? l.createdAt).toLocaleString())}</td>
        </tr>`,
    )
    .join("");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto">
    <h2 style="margin:0 0 8px">${opts.leads.length} pending lead${opts.leads.length === 1 ? "" : "s"}</h2>
    <p style="color:#6b7280;margin:0 0 16px">These leads have been sitting without follow-up past your threshold. Open the dashboard to take action.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
      <thead style="background:#f9fafb;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280">
        <tr><th style="padding:8px 12px">Lead</th><th style="padding:8px 12px">Summary</th><th style="padding:8px 12px">Last activity</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p style="margin-top:16px"><a href="${opts.appUrl}/leads?status=new" style="display:inline-block;background:#dc2626;color:white;padding:8px 16px;border-radius:6px;text-decoration:none">Open dashboard</a></p>
  </div>`;

  return r.emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1) + "\u2026";
}
