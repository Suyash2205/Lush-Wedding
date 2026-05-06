import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireEmployee } from "@/lib/auth";

const schema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(6).max(40),
  summary: z.string().max(2000).optional().nullable(),
  igUsername: z.string().min(1).max(100).optional().nullable(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
  guestCount: z.number().int().min(1).max(100000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    await requireEmployee();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const inserted = await db
    .insert(leads)
    .values({
      source: "manual",
      customerName: parsed.data.customerName.trim(),
      customerPhone: parsed.data.customerPhone.trim(),
      summary: parsed.data.summary?.trim() || null,
      igUsername: parsed.data.igUsername?.replace(/^@/, "").trim() || null,
      eventDate: parsed.data.eventDate || null,
      guestCount: parsed.data.guestCount ?? null,
      status: "new",
      lastInboundAt: new Date(),
    })
    .returning({ id: leads.id });

  return NextResponse.json({ id: inserted[0].id });
}
