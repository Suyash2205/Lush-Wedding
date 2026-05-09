"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  format,
  formatDistanceToNow,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Instagram,
  MessageSquare,
  NotebookText,
  Phone,
  Users,
  UserRound,
} from "lucide-react";
import {
  primaryLeadTitle,
  shouldShowInstagramHandleInSubtitle,
} from "@/lib/lead-display";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/lead-constants";
import { formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import type { Lead, LeadStatus, Employee } from "@/db/schema";

const STATUSES: LeadStatus[] = [
  "new",
  "awaiting_callback",
  "contacted",
  "won",
  "lost",
];

const EVENT_NONE = "__none__";

/** First-of-month values for ~5 years of month picks (wedding month). */
const EVENT_MONTH_OPTIONS = (() => {
  const anchor = startOfMonth(subMonths(new Date(), 12));
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const d = addMonths(anchor, i);
    out.push({
      value: format(d, "yyyy-MM-dd"),
      label: format(d, "MMM yyyy"),
    });
  }
  return out;
})();

function monthSelectValue(
  eventDate: string | Date | null | undefined,
): string {
  if (!eventDate) return EVENT_NONE;
  try {
    const d =
      typeof eventDate === "string"
        ? parseISO(eventDate.slice(0, 10))
        : new Date(eventDate);
    if (Number.isNaN(d.getTime())) return EVENT_NONE;
    return format(startOfMonth(d), "yyyy-MM-dd");
  } catch {
    return EVENT_NONE;
  }
}

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "bg-(--color-primary)",
  awaiting_callback: "bg-(--color-warning)",
  contacted: "bg-zinc-400",
  won: "bg-(--color-success)",
  lost: "bg-(--color-destructive)",
};

export type LeadRowData = {
  lead: Lead;
  assignee: Employee | null;
  messageCount: number;
  commentCount: number;
  openReminderCount: number;
  /** DM transcript (guest + Lush Wedding), built on the server */
  conversationSummary: string;
  stale: boolean;
};

export function LeadsTable({
  rows,
  employees,
}: {
  rows: LeadRowData[];
  employees: { id: string; name: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border) bg-(--color-card)">
      <table className="min-w-[1120px] w-full">
        <thead className="bg-(--color-muted) text-xs uppercase text-(--color-muted-foreground)">
          <tr>
            <th
              className="w-10 px-2 py-2 text-left tabular-nums"
              title="Row number in this list"
            >
              #
            </th>
            <th className="px-4 py-2 text-left">Lead</th>
            <th className="hidden px-4 py-2 text-left xl:table-cell">
              Conversation
            </th>
            <th className="hidden px-3 py-2 text-left md:table-cell">
              Event date
            </th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="hidden px-4 py-2 text-left lg:table-cell">
              Assigned
            </th>
            <th className="hidden px-4 py-2 text-left xl:table-cell">
              Activity
            </th>
            <th className="min-w-[9.5rem] whitespace-nowrap px-4 py-2 text-left">
              Last update
            </th>
            <th className="w-10 shrink-0 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <LeadRow
              key={row.lead.id}
              serial={index + 1}
              row={row}
              employees={employees}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({
  serial,
  row,
  employees,
}: {
  serial: number;
  row: LeadRowData;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(row.lead.status);
  const [assignedTo, setAssignedTo] = useState<string>(
    row.lead.assignedTo ?? "unassigned",
  );

  const activity = useMemo(() => {
    const at = new Date(row.lead.lastInboundAt ?? row.lead.createdAt);
    return {
      at,
      relative: formatDistanceToNow(at, { addSuffix: true }),
      shortStamp: format(at, "d MMM · HH:mm"),
      fullStamp: format(at, "PPpp"),
    };
  }, [row.lead.lastInboundAt, row.lead.createdAt]);

  async function patch(payload: Record<string, unknown>, msg: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${row.lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("update failed");
      toast.success(msg);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not save change");
    } finally {
      setBusy(false);
    }
  }

  function open() {
    router.push(`/leads/${row.lead.id}`);
  }

  const transcript = row.conversationSummary?.trim();
  const title = primaryLeadTitle(row.lead);
  const showHandleLine = shouldShowInstagramHandleInSubtitle(row.lead, title);

  return (
    <tr
      className="border-t border-(--color-border) transition-colors hover:bg-(--color-muted)/40"
      data-pending={pending || busy ? "1" : undefined}
    >
      <td
        className="px-2 py-3 align-top text-xs tabular-nums text-(--color-muted-foreground)"
        onClick={open}
      >
        {serial}
      </td>
      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={open}
          className="flex w-full items-start gap-3 text-left"
        >
          <SourceIcon source={row.lead.source} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium">
              <span className="truncate">{title}</span>
              {row.stale && (
                <Badge variant="destructive" className="text-[10px]">
                  Pending
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-(--color-muted-foreground)">
              {row.lead.customerPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {formatPhone(row.lead.customerPhone)}
                </span>
              )}
              {showHandleLine && (
                <span className="flex items-center gap-1">
                  <Instagram className="size-3" />@
                  {row.lead.igUsername?.replace(/^@/, "")}
                </span>
              )}
              {!row.lead.customerPhone && !showHandleLine && (
                <span className="italic">No phone yet</span>
              )}
            </div>
          </div>
        </button>
      </td>

      <td
        className="hidden max-w-md px-4 py-3 align-top text-sm text-(--color-muted-foreground) xl:table-cell"
        onClick={open}
      >
        {transcript ? (
          <div
            className="max-h-52 cursor-pointer overflow-y-auto rounded-md border border-(--color-border)/60 bg-(--color-muted)/30 px-2 py-1.5 text-xs leading-relaxed"
            title={transcript}
          >
            <p className="whitespace-pre-wrap break-words">{transcript}</p>
          </div>
        ) : row.lead.summary?.trim() ? (
          <p className="cursor-pointer text-xs italic leading-snug">
            No DMs in thread yet. Note: {row.lead.summary.trim()}
          </p>
        ) : (
          <span className="text-xs italic">No messages yet</span>
        )}
      </td>

      <td
        className="hidden max-w-[11rem] px-3 py-3 align-top text-sm md:table-cell"
        onClick={open}
      >
        <div className="flex flex-col gap-1.5">
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={monthSelectValue(row.lead.eventDate)}
              onValueChange={(v) => {
                if (v === EVENT_NONE) {
                  patch({ eventDate: null }, "Event date cleared");
                } else {
                  patch({ eventDate: v }, "Event month saved");
                }
              }}
            >
              <SelectTrigger
                className="h-8 w-full min-w-0 py-0 text-xs"
                aria-label="Wedding month"
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVENT_NONE}>No date</SelectItem>
                {EVENT_MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {row.lead.eventDate ? (
            <span className="flex items-center gap-1 text-[11px] text-(--color-muted-foreground)">
              <CalendarDays className="size-3 shrink-0" />
              {format(
                typeof row.lead.eventDate === "string"
                  ? parseISO(row.lead.eventDate.slice(0, 10))
                  : new Date(row.lead.eventDate),
                "d MMM yyyy",
              )}
            </span>
          ) : null}
          {row.lead.guestCount != null ? (
            <span className="flex items-center gap-1.5 text-xs text-(--color-muted-foreground)">
              <Users className="size-3 shrink-0" />
              {row.lead.guestCount} guests
            </span>
          ) : (
            <span className="text-xs italic text-(--color-muted-foreground)">
              Capacity TBD
            </span>
          )}
        </div>
      </td>

      <td
        className="px-4 py-3 align-top"
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value={status}
          onValueChange={(v) => {
            const next = v as LeadStatus;
            setStatus(next);
            patch({ status: next }, "Status updated");
          }}
        >
          <SelectTrigger
            className="h-8 min-w-[140px] gap-2 py-0"
            aria-label="Change status"
          >
            <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${STATUS_DOT[s]}`} />
                  {STATUS_LABELS[s]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      <td
        className="hidden px-4 py-3 align-top lg:table-cell"
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value={assignedTo}
          onValueChange={(v) => {
            setAssignedTo(v);
            patch(
              { assignedTo: v === "unassigned" ? null : v },
              "Assignment updated",
            );
          }}
        >
          <SelectTrigger
            className="h-8 min-w-[150px] py-0"
            aria-label="Change assignee"
          >
            <span className="flex items-center gap-1.5 text-sm">
              <UserRound className="size-3" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      <td
        className="hidden px-4 py-3 align-top text-xs text-(--color-muted-foreground) xl:table-cell"
        onClick={open}
      >
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" /> {row.messageCount}{" "}
            {row.messageCount === 1 ? "message" : "messages"}
          </span>
          {row.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <NotebookText className="size-3" /> {row.commentCount}{" "}
              {row.commentCount === 1 ? "note" : "notes"}
            </span>
          )}
          {row.openReminderCount > 0 && (
            <span className="flex items-center gap-1 text-(--color-warning-foreground, var(--color-foreground))">
              <Bell className="size-3" /> {row.openReminderCount} reminder
              {row.openReminderCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </td>

      <td
        className="min-w-[9.5rem] px-4 py-3 align-top whitespace-nowrap"
        title={activity.fullStamp}
        onClick={open}
      >
        <span className="block text-xs font-medium text-(--color-foreground) tabular-nums">
          {activity.relative}
        </span>
        <span className="block text-[11px] text-(--color-muted-foreground) tabular-nums">
          {activity.shortStamp}
        </span>
      </td>

      <td className="w-10 px-2 py-3 align-top text-right" onClick={open}>
        <ChevronRight className="ml-auto size-4 text-(--color-muted-foreground)" />
      </td>
    </tr>
  );
}

function SourceIcon({ source }: { source: "instagram" | "manual" }) {
  if (source === "instagram") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">
        <Instagram className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--color-muted) text-(--color-muted-foreground)">
      <MessageSquare className="size-4" />
    </span>
  );
}
