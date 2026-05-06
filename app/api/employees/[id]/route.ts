import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, ne, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { requireOwner } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["owner", "agent"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.role === "agent") {
    // Don't allow demoting the last owner.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(and(eq(employees.role, "owner"), ne(employees.id, id)));
    if (Number(count) === 0) {
      return NextResponse.json(
        { error: "Cannot demote the only owner" },
        { status: 400 },
      );
    }
  }

  await db
    .update(employees)
    .set({ role: parsed.data.role })
    .where(eq(employees.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let me;
  try {
    me = await requireOwner();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === me.id) {
    return NextResponse.json(
      { error: "You can't remove yourself" },
      { status: 400 },
    );
  }

  const target = await db.select().from(employees).where(eq(employees.id, id));
  if (!target[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Don't allow removing the last owner.
  if (target[0].role === "owner") {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(and(eq(employees.role, "owner"), ne(employees.id, id)));
    if (Number(count) === 0) {
      return NextResponse.json(
        { error: "Cannot remove the only owner" },
        { status: 400 },
      );
    }
  }

  // Best-effort: delete the Clerk user so they can't sign back in.
  try {
    const client = await clerkClient();
    await client.users.deleteUser(target[0].clerkUserId);
  } catch (err) {
    console.warn("[employees DELETE] Clerk user delete failed", err);
  }

  // Then delete our local row. Cascading FKs remove their comments/reminders;
  // leads they were assigned to get assignedTo set to null.
  await db.delete(employees).where(eq(employees.id, id));

  return NextResponse.json({ ok: true });
}
