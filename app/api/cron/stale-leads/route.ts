import { NextResponse } from "next/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { getOwnerNotificationEmail, getStaleThresholdHours } from "@/lib/leads";
import { sendStaleDigest } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const thresholdHours = await getStaleThresholdHours();
  const cutoff = new Date(Date.now() - thresholdHours * 3600_000);

  // Find newly stale leads — those that crossed the threshold AND haven't been
  // notified yet (stale_notified_at IS NULL, or was reset by new inbound activity).
  const stale = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.status, "new"),
        isNull(leads.staleNotifiedAt),
        or(
          and(isNull(leads.lastInboundAt), lt(leads.createdAt, cutoff)),
          lt(leads.lastInboundAt, cutoff),
        ),
      ),
    )
    .orderBy(leads.lastInboundAt);

  if (stale.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const to = await getOwnerNotificationEmail();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${req.headers.get("host") ?? "localhost:3000"}`;

  const result = await sendStaleDigest({ to, leads: stale, appUrl }).catch(
    (err) => {
      console.error("[cron] sendStaleDigest failed", err);
      return { error: err };
    },
  );

  // Mark these leads as notified so we don't re-email them on every cron tick.
  const ids = stale.map((l) => l.id);
  await db
    .update(leads)
    .set({ staleNotifiedAt: new Date() })
    .where(sql`${leads.id} = ANY(${ids})`);

  return NextResponse.json({ ok: true, notified: stale.length, result });
}
