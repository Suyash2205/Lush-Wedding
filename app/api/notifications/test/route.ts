import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getOwnerNotificationEmail } from "@/lib/leads";
import { sendStaleDigest } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = await getOwnerNotificationEmail();
  if (!to) {
    return NextResponse.json(
      {
        error:
          "No notification email configured. Save it in Settings → Venue first.",
      },
      { status: 400 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY is not set. Add it as an environment variable on Vercel and redeploy.",
      },
      { status: 400 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${req.headers.get("host") ?? "localhost:3000"}`;

  const sample = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      customerName: "Sample Lead",
      igUsername: null,
      summary:
        "This is a test stale-lead digest. If you can read this, Resend is working and the daily cron will email you when a real lead has been sitting too long.",
      lastInboundAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
  ];

  const result = (await sendStaleDigest({ to, leads: sample, appUrl }).catch(
    (err: unknown) => ({ error: err instanceof Error ? err.message : String(err) }),
  )) as
    | { skipped?: boolean }
    | { error: unknown }
    | { data?: unknown; error?: unknown };

  // Resend SDK returns { data, error } — surface the error to the client.
  const resendError = (result as { error?: unknown }).error;
  if (resendError) {
    const message =
      typeof resendError === "object" && resendError !== null
        ? // @ts-expect-error best-effort message extraction
          (resendError.message ?? JSON.stringify(resendError))
        : String(resendError);
    return NextResponse.json(
      { error: `Resend rejected: ${message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, to, result });
}
