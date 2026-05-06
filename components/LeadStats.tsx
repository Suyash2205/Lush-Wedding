import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Inbox,
  PhoneIncoming,
  UserMinus,
} from "lucide-react";
import type { LeadStats } from "@/lib/leads";

const cards: {
  key: keyof LeadStats | "newPlusAwaiting";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone?: string;
  description?: string;
}[] = [
  {
    key: "todayCount",
    label: "New today",
    icon: Inbox,
    href: "/leads",
    description: "Created in the last 24h",
  },
  {
    key: "staleCount",
    label: "Pending follow-up",
    icon: AlertTriangle,
    href: "/leads?status=new",
    tone: "destructive",
    description: "New leads past the stale threshold",
  },
  {
    key: "awaitingCount",
    label: "Awaiting callback",
    icon: PhoneIncoming,
    href: "/leads?status=awaiting_callback",
    tone: "warning",
  },
  {
    key: "unassignedCount",
    label: "Unassigned",
    icon: UserMinus,
    href: "/leads?assignedTo=unassigned",
  },
  {
    key: "wonCount",
    label: "Won",
    icon: CheckCircle2,
    href: "/leads?status=won",
    tone: "success",
  },
  {
    key: "total",
    label: "Total leads",
    icon: CalendarDays,
    href: "/leads",
  },
];

export function LeadStatsBar({ stats }: { stats: LeadStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const value = (stats as unknown as Record<string, number>)[c.key as string] ?? 0;
        return (
          <Link
            key={c.key as string}
            href={c.href}
            className={`group rounded-xl border border-(--color-border) bg-(--color-card) p-3 transition-colors hover:bg-(--color-muted)/40 ${
              c.tone === "destructive" && value > 0
                ? "border-(--color-destructive)/30 bg-(--color-destructive)/5"
                : ""
            } ${
              c.tone === "warning" && value > 0
                ? "border-(--color-warning)/40 bg-(--color-warning)/5"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-(--color-muted-foreground)">
                {c.label}
              </span>
              <c.icon
                className={`size-4 ${
                  c.tone === "destructive" && value > 0
                    ? "text-(--color-destructive)"
                    : c.tone === "warning" && value > 0
                      ? "text-(--color-warning)"
                      : c.tone === "success"
                        ? "text-(--color-success)"
                        : "text-(--color-muted-foreground)"
                }`}
              />
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {value}
            </div>
            {c.description && (
              <div className="mt-0.5 text-[11px] text-(--color-muted-foreground)">
                {c.description}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
