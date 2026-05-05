import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { requireEmployee } from "@/lib/auth";

const schema = z.object({
  body: z.string().min(1).max(4000),
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
    .insert(comments)
    .values({
      leadId: id,
      employeeId: employee.id,
      body: parsed.data.body.trim(),
    })
    .returning({ id: comments.id });

  return NextResponse.json({ id: inserted[0].id });
}
