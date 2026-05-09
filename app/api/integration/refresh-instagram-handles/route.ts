import { NextResponse } from "next/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { fetchInstagramMessagingSenderProfile } from "@/lib/meta/instagram-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PER_REQUEST = 40;

/**
 * One-shot backfill: resolve @username for Instagram leads that only have IGSID.
 * Owner only. Call after fixing META_PAGE_ACCESS_TOKEN or permissions.
 */
export async function POST() {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token =
    process.env.META_PAGE_ACCESS_TOKEN ??
    process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "META_PAGE_ACCESS_TOKEN is not set. Add it on Vercel, redeploy, then try again.",
      },
      { status: 400 },
    );
  }

  const pending = await db
    .select({
      id: leads.id,
      igUserId: leads.igUserId,
      customerName: leads.customerName,
    })
    .from(leads)
    .where(
      and(
        eq(leads.source, "instagram"),
        isNotNull(leads.igUserId),
        isNull(leads.igUsername),
      ),
    )
    .limit(MAX_PER_REQUEST);

  let updated = 0;
  const errors: string[] = [];

  for (const row of pending) {
    if (!row.igUserId) continue;
    const profile = await fetchInstagramMessagingSenderProfile(row.igUserId);
    if (!profile?.username) {
      errors.push(row.igUserId.slice(0, 8));
      continue;
    }

    const patch: Partial<typeof leads.$inferInsert> = {
      igUsername: profile.username,
      updatedAt: new Date(),
    };

    if (
      profile.name &&
      !(row.customerName && row.customerName.trim())
    ) {
      patch.customerName = profile.name;
    }

    await db.update(leads).set(patch).where(eq(leads.id, row.id));
    updated += 1;

    // Gentle spacing so we don’t spike Graph rate limits.
    await new Promise((r) => setTimeout(r, 150));
  }

  return NextResponse.json({
    ok: true,
    processed: pending.length,
    updated,
    skippedNoUsername: errors.length,
    note:
      updated < pending.length
        ? "Some IGSIDs still failed — token may lack permissions, or users never opened a DM (consent required). Check Vercel logs for [ig-profile]."
        : undefined,
  });
}
