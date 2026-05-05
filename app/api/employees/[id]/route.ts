import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, ne, sql } from "drizzle-orm";
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
