import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { venueInfo, appSettings } from "@/db/schema";
import { requireOwner } from "@/lib/auth";

const schema = z.object({
  venue: z.record(z.string(), z.string()),
  staleThresholdHours: z.string().optional(),
  notificationEmail: z.string().email().or(z.literal("")).optional(),
});

export async function PUT(req: Request) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  for (const [key, value] of Object.entries(parsed.data.venue)) {
    await db
      .insert(venueInfo)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: venueInfo.key,
        set: { value, updatedAt: new Date() },
      });
  }

  if (parsed.data.staleThresholdHours !== undefined) {
    await db
      .insert(appSettings)
      .values({
        key: "stale_threshold_hours",
        value: parsed.data.staleThresholdHours,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: parsed.data.staleThresholdHours,
          updatedAt: new Date(),
        },
      });
  }

  if (parsed.data.notificationEmail !== undefined) {
    await db
      .insert(appSettings)
      .values({
        key: "owner_notification_email",
        value: parsed.data.notificationEmail,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: parsed.data.notificationEmail,
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({ ok: true });
}
