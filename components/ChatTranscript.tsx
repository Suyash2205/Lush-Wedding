import { format } from "date-fns";
import type { Message } from "@/db/schema";

export function ChatTranscript({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-(--color-border) p-8 text-center text-sm text-(--color-muted-foreground)">
        No messages yet. If this is an Instagram lead, the customer&apos;s DMs will
        appear here.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
              m.direction === "in"
                ? "rounded-bl-sm bg-(--color-muted) text-(--color-foreground)"
                : "rounded-br-sm bg-(--color-primary) text-(--color-primary-foreground)"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
            <div className="mt-1 text-[10px] opacity-70">
              {format(new Date(m.createdAt), "PPp")}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
