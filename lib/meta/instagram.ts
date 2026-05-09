/**
 * Types and parsing helpers for Instagram Messaging webhook payloads.
 * The payload follows the Messenger Platform shape (`object: "instagram"`).
 *
 * https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook
 */

export type IgWebhookPayload = {
  object: string;
  entry: IgEntry[];
};

export type IgEntry = {
  id: string;
  time?: number;
  messaging?: IgMessaging[];
};

export type IgMessaging = {
  sender: { id: string; username?: string };
  recipient: { id: string };
  timestamp?: number;
  message?: {
    mid: string;
    text?: string;
    /** True when your Instagram business/page sent this message (webhook replay). */
    is_echo?: boolean;
    is_deleted?: boolean;
    attachments?: { type: string; payload?: { url?: string } }[];
  };
  postback?: { mid?: string; title?: string; payload?: string };
  read?: { mid?: string };
  delivery?: { mids?: string[] };
};

export type ParsedIgEvent = {
  pageId: string;
  /** Instagram-scoped user id for the customer (lead) in this thread */
  leadIgUserId: string;
  senderUsername?: string;
  messageId: string;
  text: string;
  timestamp: Date;
  direction: "in" | "out";
};

/** Text body for ingest, or null if there is nothing to store. */
export function instagramMessageText(
  message: NonNullable<IgMessaging["message"]>,
): string | null {
  if (message.is_deleted) return null;
  const text =
    message.text ??
    message.attachments
      ?.map((a) => `[${a.type}${a.payload?.url ? `: ${a.payload.url}` : ""}]`)
      .join(" ") ??
    "";
  return text.length > 0 ? text : null;
}

export function parseIgWebhook(body: IgWebhookPayload): ParsedIgEvent[] {
  if (body.object !== "instagram") return [];
  const events: ParsedIgEvent[] = [];

  for (const entry of body.entry ?? []) {
    for (const m of entry.messaging ?? []) {
      const msg = m.message;
      if (!msg) continue;
      const text = instagramMessageText(msg);
      if (!text) continue;

      const ts = new Date(m.timestamp ?? entry.time ?? Date.now());

      if (msg.is_echo) {
        // Echo: IG business → customer; `recipient.id` is the thread (lead) IGSID.
        events.push({
          pageId: entry.id,
          leadIgUserId: m.recipient.id,
          messageId: msg.mid,
          text,
          timestamp: ts,
          direction: "out",
        });
        continue;
      }

      events.push({
        pageId: entry.id,
        leadIgUserId: m.sender.id,
        senderUsername: m.sender.username,
        messageId: msg.mid,
        text,
        timestamp: ts,
        direction: "in",
      });
    }
  }
  return events;
}
