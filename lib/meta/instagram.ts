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
  senderId: string; // IGSID
  senderUsername?: string;
  messageId: string;
  text: string;
  timestamp: Date;
  isEcho: boolean;
};

export function parseIgWebhook(body: IgWebhookPayload): ParsedIgEvent[] {
  if (body.object !== "instagram") return [];
  const events: ParsedIgEvent[] = [];

  for (const entry of body.entry ?? []) {
    for (const m of entry.messaging ?? []) {
      const msg = m.message;
      if (!msg || msg.is_deleted) continue;
      // Skip echoes by default — those are messages our own page sent.
      if (msg.is_echo) continue;
      const text =
        msg.text ??
        msg.attachments
          ?.map((a) => `[${a.type}${a.payload?.url ? `: ${a.payload.url}` : ""}]`)
          .join(" ") ??
        "";
      if (!text) continue;
      events.push({
        pageId: entry.id,
        senderId: m.sender.id,
        senderUsername: m.sender.username,
        messageId: msg.mid,
        text,
        timestamp: new Date(m.timestamp ?? entry.time ?? Date.now()),
        isEcho: false,
      });
    }
  }
  return events;
}
