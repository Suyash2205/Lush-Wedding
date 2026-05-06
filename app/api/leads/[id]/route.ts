import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, leadStatusEnum } from "@/db/schema";
import { requireEmployee } from "@/lib/auth";

const patchSchema = z.object({
  status: z.enum(leadStatusEnum.enumValues).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerPhone: z.string().min(6).max(40).optional(),
  summary: z.string().max(2000).nullable().optional(),
  igUsername: z.string().max(100).nullable().optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional(),
  guestCount: z.number().int().min(1).max(100000).nullable().optional(),
  markContacted: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireEmployee();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const update: Partial<typeof leads.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.assignedTo !== undefined)
    update.assignedTo = parsed.data.assignedTo;
  if (parsed.data.customerName !== undefined)
    update.customerName = parsed.data.customerName;
  if (parsed.data.customerPhone !== undefined)
    update.customerPhone = parsed.data.customerPhone;
  if (parsed.data.summary !== undefined) update.summary = parsed.data.summary;
  if (parsed.data.igUsername !== undefined)
    update.igUsername = parsed.data.igUsername
      ? parsed.data.igUsername.replace(/^@/, "").trim()
      : null;
  if (parsed.data.eventDate !== undefined)
    update.eventDate = parsed.data.eventDate;
  if (parsed.data.guestCount !== undefined)
    update.guestCount = parsed.data.guestCount;
  if (parsed.data.markContacted) {
    update.lastContactedAt = new Date();
    if (!parsed.data.status) update.status = "contacted";
  }

  await db.update(leads).set(update).where(eq(leads.id, id));

  return NextResponse.json({ ok: true });
}
