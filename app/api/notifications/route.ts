import { NextResponse } from "next/server";
import { countNotifications } from "@/lib/leads";
import { requireEmployee } from "@/lib/auth";

export async function GET() {
  try {
    await requireEmployee();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counts = await countNotifications();
  return NextResponse.json(counts);
}
