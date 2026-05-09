import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, messages } from "@/db/schema";
import { verifyMetaSignature } from "@/lib/meta/verify";
import { parseIgWebhook, type IgWebhookPayload } from "@/lib/meta/instagram";
import { fetchInstagramMessagingSenderProfile } from "@/lib/meta/instagram-profile";
import { extractFirstPhone, truncate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Verification handshake (Meta calls this when you save the webhook URL) ---
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// --- Inbound message events ---
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET ?? "";

  // In dev mode without a secret configured we accept anything; in prod we
  // refuse unsigned/mis-signed traffic.
  const skipSignature = process.env.NODE_ENV !== "production" && !appSecret;
  if (!skipSignature) {
    const ok = verifyMetaSignature(rawBody, signature, appSecret);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: IgWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = parseIgWebhook(payload);
  // Meta expects 200 within ~20s. Process inline since the work is tiny, but
  // catch errors per-event so one bad event doesn't break the rest.
  for (const ev of events) {
    try {
      if (ev.direction === "out") {
        await ingestOutboundInstagramMessage(ev);
      } else {
        await ingestInboundInstagramMessage(ev);
      }
    } catch (err) {
      console.error("[ig-webhook] failed to ingest event", err);
    }
  }

  return NextResponse.json({ ok: true });
}

async function dedupeIgMessage(messageId: string): Promise<boolean> {
  const existing = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.igMessageId, messageId))
    .limit(1);
  return Boolean(existing[0]);
}

/** Incoming DM from the customer. */
async function ingestInboundInstagramMessage(
  ev: import("@/lib/meta/instagram").ParsedIgEvent,
) {
  if (await dedupeIgMessage(ev.messageId)) return;

  const found = await db
    .select()
    .from(leads)
    .where(eq(leads.igUserId, ev.leadIgUserId))
    .limit(1);

  const webhookUsername = ev.senderUsername?.trim();
  let resolvedUsername =
    webhookUsername || found[0]?.igUsername?.trim() || undefined;
  let resolvedNameFromGraph: string | undefined;

  if (!resolvedUsername) {
    const p = await fetchInstagramMessagingSenderProfile(ev.leadIgUserId);
    if (p?.username?.trim()) resolvedUsername = p.username.trim();
    if (p?.name?.trim()) resolvedNameFromGraph = p.name.trim();
  }

  let leadId: string;
  if (found[0]) {
    leadId = found[0].id;
    const phoneFromMsg = extractFirstPhone(ev.text);
    const summary =
      found[0].summary && found[0].summary.length > 0
        ? found[0].summary
        : truncate(ev.text, 240);

    const update: Partial<typeof leads.$inferInsert> = {
      lastInboundAt: ev.timestamp,
      updatedAt: new Date(),
      summary,
      status:
        found[0].status === "won" || found[0].status === "lost"
          ? "new"
          : found[0].status,
      staleNotifiedAt: null,
    };
    if (phoneFromMsg && !found[0].customerPhone) {
      update.customerPhone = phoneFromMsg;
      update.status = "awaiting_callback";
    }
    if (resolvedUsername && !found[0].igUsername) {
      update.igUsername = resolvedUsername;
    }
    if (
      resolvedNameFromGraph &&
      !(found[0].customerName && found[0].customerName.trim())
    ) {
      update.customerName = resolvedNameFromGraph;
    }

    await db.update(leads).set(update).where(eq(leads.id, leadId));
  } else {
    const phoneFromMsg = extractFirstPhone(ev.text);
    const inserted = await db
      .insert(leads)
      .values({
        source: "instagram",
        igUserId: ev.leadIgUserId,
        igUsername: resolvedUsername ?? null,
        customerName: resolvedNameFromGraph ?? null,
        customerPhone: phoneFromMsg,
        summary: truncate(ev.text, 240),
        status: phoneFromMsg ? "awaiting_callback" : "new",
        lastInboundAt: ev.timestamp,
      })
      .returning({ id: leads.id });
    leadId = inserted[0].id;
  }

  await db.insert(messages).values({
    leadId,
    direction: "in",
    source: "instagram",
    content: ev.text,
    igMessageId: ev.messageId,
    createdAt: ev.timestamp,
  });
}

/** Outgoing DM from your IG business (Meta sends as message echo). */
async function ingestOutboundInstagramMessage(
  ev: import("@/lib/meta/instagram").ParsedIgEvent,
) {
  if (await dedupeIgMessage(ev.messageId)) return;

  const found = await db
    .select()
    .from(leads)
    .where(eq(leads.igUserId, ev.leadIgUserId))
    .limit(1);

  let resolvedUsername = found[0]?.igUsername?.trim() || undefined;
  let resolvedNameFromGraph: string | undefined;
  if (!found[0] || !resolvedUsername) {
    const p = await fetchInstagramMessagingSenderProfile(ev.leadIgUserId);
    if (p?.username?.trim()) resolvedUsername = p.username.trim();
    if (p?.name?.trim()) resolvedNameFromGraph = p.name.trim();
  }

  let leadId: string;
  if (found[0]) {
    leadId = found[0].id;
    const update: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
    if (!(found[0].summary && found[0].summary.trim())) {
      update.summary = truncate(ev.text, 240);
    }
    if (resolvedUsername && !found[0].igUsername) {
      update.igUsername = resolvedUsername;
    }
    if (
      resolvedNameFromGraph &&
      !(found[0].customerName && found[0].customerName.trim())
    ) {
      update.customerName = resolvedNameFromGraph;
    }
    await db.update(leads).set(update).where(eq(leads.id, leadId));
  } else {
    const inserted = await db
      .insert(leads)
      .values({
        source: "instagram",
        igUserId: ev.leadIgUserId,
        igUsername: resolvedUsername ?? null,
        customerName: resolvedNameFromGraph ?? null,
        summary: truncate(ev.text, 240),
        status: "new",
      })
      .returning({ id: leads.id });
    leadId = inserted[0].id;
  }

  await db.insert(messages).values({
    leadId,
    direction: "out",
    source: "instagram",
    content: ev.text,
    igMessageId: ev.messageId,
    createdAt: ev.timestamp,
  });
}
