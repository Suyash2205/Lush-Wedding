import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { requireEmployee } from "@/lib/auth";

const schema = z.object({
  dueAt: z.string().datetime(),
  note: z.string().max(2000).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let employee;
  try {
    employee = await requireEmployee();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const inserted = await db
    .insert(reminders)
    .values({
      leadId: id,
      employeeId: employee.id,
      dueAt: new Date(parsed.data.dueAt),
      note: parsed.data.note?.trim() || null,
    })
    .returning({ id: reminders.id });

  return NextResponse.json({ id: inserted[0].id });
}

const patchSchema = z.object({
  reminderId: z.string().uuid(),
  completed: z.boolean(),
});

export async function PATCH(
  req: Request,
) {
  try {
    await requireEmployee();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db
    .update(reminders)
    .set({ completed: parsed.data.completed })
    .where(eq(reminders.id, parsed.data.reminderId));

  return NextResponse.json({ ok: true });
}
