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
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/lead-constants";
import { formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import type { Lead, LeadStatus, Employee } from "@/db/schema";

const EVENT_NONE = "__none__";

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

function clipSnippet(s: string | null | undefined, max = 86): string {
  if (!s) return "";
  const t = s
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const STATUS_DOT: Record<LeadStatus, string> = {
  new: "bg-(--color-primary)",
  awaiting_callback: "bg-(--color-warning)",
  tentative: "bg-sky-500",
  very_positive: "bg-emerald-500",
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
  lastGuestPreview: string | null;
  stale: boolean;
};

type PatchFn = (payload: Record<string, unknown>, msg: string) => Promise<void>;

function useLeadPatch(leadId: string) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function patch(payload: Record<string, unknown>, msg: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
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
  return { patch, busy };
}

function LeadSummaryPanel({
  row,
  patch,
  compact,
}: {
  row: LeadRowData;
  patch: PatchFn;
  compact?: boolean;
}) {
  const snippetSource =
    row.lastGuestPreview?.trim() || row.lead.summary?.trim() || "";
  const snippet = clipSnippet(
    snippetSource,
    compact ? 140 : 86,
  );

  const weddingLine = row.lead.eventDate
    ? format(
        typeof row.lead.eventDate === "string"
          ? parseISO(row.lead.eventDate.slice(0, 10))
          : new Date(row.lead.eventDate),
        "d MMM yyyy",
      )
    : "—";

  const guestLine =
    row.lead.guestCount != null ? `${row.lead.guestCount} guests` : "—";

  const textCls = compact ? "text-xs" : "text-[11px]";
  const snippetCls = compact ? "text-xs" : "text-[10px]";

  return (
    <div
      className={`flex flex-col gap-1.5 leading-snug text-(--color-muted-foreground) ${textCls}`}
    >
      <div className="flex items-start gap-1.5">
        <CalendarDays className="mt-0.5 size-3 shrink-0 opacity-70" />
        <span className="min-w-0">
          <span className="text-(--color-muted-foreground)">Wedding </span>
          <span className="font-medium text-(--color-foreground)">
            {weddingLine}
          </span>
        </span>
      </div>
      <div className="flex items-start gap-1.5">
        <Users className="mt-0.5 size-3 shrink-0 opacity-70" />
        <span className="min-w-0">
          <span className="text-(--color-muted-foreground)">Guests </span>
          <span className="font-medium text-(--color-foreground)">
            {guestLine}
          </span>
        </span>
      </div>
      {snippet ? (
        <p
          className={`line-clamp-3 text-(--color-foreground)/85 ${snippetCls}`}
          title={snippetSource}
        >
          {snippet}
        </p>
      ) : (
        <p className={`italic opacity-70 ${snippetCls}`}>No message yet</p>
      )}
      <div onClick={(e) => e.stopPropagation()}>
        <Select
          value={monthSelectValue(row.lead.eventDate)}
          onValueChange={(v) => {
            if (v === EVENT_NONE) {
              void patch({ eventDate: null }, "Event date cleared");
            } else {
              void patch({ eventDate: v }, "Event month saved");
            }
          }}
        >
          <SelectTrigger
            className={`h-8 w-full min-w-0 py-0 ${compact ? "text-xs" : "text-[10px]"}`}
            aria-label="Wedding month"
          >
            <SelectValue placeholder="Set month" />
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
    </div>
  );
}

export function LeadsTable({
  rows,
  employees,
}: {
  rows: LeadRowData[];
  employees: { id: string; name: string }[];
}) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row, index) => (
          <LeadMobileCard
            key={row.lead.id}
            serial={index + 1}
            row={row}
            employees={employees}
          />
        ))}
      </div>

      <div className="hidden rounded-xl border border-(--color-border) bg-(--color-card) [scrollbar-gutter:stable] md:block">
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] touch-pan-x">
          <table className="w-max min-w-full text-sm">
            <thead className="bg-(--color-muted) text-[10px] font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              <tr>
                <th className="sticky left-0 z-10 w-8 bg-(--color-muted) px-1 py-1.5 text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                  #
                </th>
                <th className="whitespace-nowrap px-2 py-1.5 text-left">
                  Lead
                </th>
                <th className="min-w-[10.5rem] whitespace-nowrap px-2 py-1.5 text-left">
                  Summary
                </th>
                <th className="whitespace-nowrap px-2 py-1.5 text-left">
                  Status
                </th>
                <th className="whitespace-nowrap px-2 py-1.5 text-left">
                  Assigned
                </th>
                <th className="whitespace-nowrap px-2 py-1.5 text-left">
                  Activity
                </th>
                <th className="whitespace-nowrap px-2 py-1.5 text-left">
                  Last
                </th>
                <th className="w-8 px-1 py-1.5"></th>
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
      </div>
    </>
  );
}

function LeadMobileCard({
  serial,
  row,
  employees,
}: {
  serial: number;
  row: LeadRowData;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { patch, busy } = useLeadPatch(row.lead.id);
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

  function open() {
    router.push(`/leads/${row.lead.id}`);
  }

  const title = primaryLeadTitle(row.lead);
  const showHandleLine = shouldShowInstagramHandleInSubtitle(row.lead, title);

  return (
    <article
      className="rounded-xl border border-(--color-border) bg-(--color-card) p-3 shadow-sm"
      data-pending={busy ? "1" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span className="pt-0.5 text-xs tabular-nums text-(--color-muted-foreground)">
            {serial}
          </span>
          <SourceIcon source={row.lead.source} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium leading-tight">{title}</span>
              {row.stale && (
                <Badge variant="destructive" className="text-[9px]">
                  Pending
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-(--color-muted-foreground)">
              {row.lead.customerPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3 shrink-0" />
                  {formatPhone(row.lead.customerPhone)}
                </span>
              )}
              {showHandleLine && (
                <span className="flex items-center gap-1">
                  <Instagram className="size-3" />@
                  {row.lead.igUsername?.replace(/^@/, "")}
                </span>
              )}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={open}
          className="shrink-0 rounded-md p-2 text-(--color-muted-foreground) hover:bg-(--color-muted)"
          aria-label="Open lead"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-(--color-border)/60 bg-(--color-muted)/25 p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Summary
        </p>
        <LeadSummaryPanel row={row} patch={patch} compact />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div onClick={(e) => e.stopPropagation()}>
          <p className="mb-1 text-[10px] font-semibold uppercase text-(--color-muted-foreground)">
            Status
          </p>
          <Select
            value={status}
            onValueChange={(v) => {
              const next = v as LeadStatus;
              setStatus(next);
              void patch({ status: next }, "Status updated");
            }}
          >
            <SelectTrigger className="h-9 w-full" aria-label="Change status">
              <span
                className={`size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${STATUS_DOT[s]}`} />
                    {STATUS_LABELS[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <p className="mb-1 text-[10px] font-semibold uppercase text-(--color-muted-foreground)">
            Assigned
          </p>
          <Select
            value={assignedTo}
            onValueChange={(v) => {
              setAssignedTo(v);
              void patch(
                { assignedTo: v === "unassigned" ? null : v },
                "Assignment updated",
              );
            }}
          >
            <SelectTrigger className="h-9 w-full" aria-label="Change assignee">
              <span className="flex items-center gap-2">
                <UserRound className="size-4 shrink-0" />
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
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--color-border) pt-3 text-xs text-(--color-muted-foreground)">
        <span className="tabular-nums">
          {row.messageCount} msg
          {row.commentCount > 0 &&
            ` · ${row.commentCount} note${row.commentCount === 1 ? "" : "s"}`}
          {row.openReminderCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-(--color-warning-foreground, var(--color-foreground))">
              <Bell className="size-3" />
              {row.openReminderCount}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={open}
          className="text-right text-xs tabular-nums hover:underline"
          title={activity.fullStamp}
        >
          <span className="block font-medium text-(--color-foreground)">
            {activity.relative}
          </span>
          <span className="text-(--color-muted-foreground)">
            {activity.shortStamp}
          </span>
        </button>
      </div>
    </article>
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
  const { patch, busy } = useLeadPatch(row.lead.id);
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

  function open() {
    router.push(`/leads/${row.lead.id}`);
  }

  const title = primaryLeadTitle(row.lead);
  const showHandleLine = shouldShowInstagramHandleInSubtitle(row.lead, title);

  return (
    <tr
      className="group border-t border-(--color-border) transition-colors hover:bg-(--color-muted)/40"
      data-pending={busy ? "1" : undefined}
    >
      <td className="sticky left-0 z-[1] border-r border-(--color-border)/50 bg-(--color-card) px-1 py-2 align-top text-[10px] tabular-nums text-(--color-muted-foreground) shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-(--color-muted)/40">
        <button type="button" onClick={open} className="w-full text-left">
          {serial}
        </button>
      </td>
      <td className="max-w-[14rem] px-2 py-2 align-top">
        <button
          type="button"
          onClick={open}
          className="flex w-full min-w-0 items-start gap-2 text-left"
        >
          <SourceIcon source={row.lead.source} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium leading-tight">
              <span className="truncate">{title}</span>
              {row.stale && (
                <Badge variant="destructive" className="shrink-0 text-[9px]">
                  Pending
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] text-(--color-muted-foreground)">
              {row.lead.customerPhone && (
                <span className="flex min-w-0 items-center gap-0.5">
                  <Phone className="size-2.5 shrink-0" />
                  <span className="truncate">
                    {formatPhone(row.lead.customerPhone)}
                  </span>
                </span>
              )}
              {showHandleLine && (
                <span className="flex items-center gap-0.5">
                  <Instagram className="size-2.5" />@
                  {row.lead.igUsername?.replace(/^@/, "")}
                </span>
              )}
              {!row.lead.customerPhone && !showHandleLine && (
                <span className="italic">No phone</span>
              )}
            </div>
          </div>
        </button>
      </td>

      <td className="max-w-[12rem] px-2 py-2 align-top" onClick={open}>
        <LeadSummaryPanel row={row} patch={patch} />
      </td>

      <td className="whitespace-nowrap px-2 py-2 align-top" onClick={(e) => e.stopPropagation()}>
        <Select
          value={status}
          onValueChange={(v) => {
            const next = v as LeadStatus;
            setStatus(next);
            void patch({ status: next }, "Status updated");
          }}
        >
          <SelectTrigger
            className="h-7 min-w-[7.5rem] gap-1.5 py-0 text-xs"
            aria-label="Change status"
          >
            <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
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

      <td className="whitespace-nowrap px-2 py-2 align-top" onClick={(e) => e.stopPropagation()}>
        <Select
          value={assignedTo}
          onValueChange={(v) => {
            setAssignedTo(v);
            void patch(
              { assignedTo: v === "unassigned" ? null : v },
              "Assignment updated",
            );
          }}
        >
          <SelectTrigger
            className="h-7 min-w-[7.5rem] py-0 text-xs"
            aria-label="Change assignee"
          >
            <span className="flex min-w-0 items-center gap-1 text-xs">
              <UserRound className="size-3 shrink-0" />
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
        className="whitespace-nowrap px-2 py-2 align-top text-[10px] text-(--color-muted-foreground)"
        onClick={open}
      >
        <span className="tabular-nums">{row.messageCount} msg</span>
        {row.commentCount > 0 && (
          <span className="tabular-nums">
            {" · "}
            {row.commentCount} note{row.commentCount === 1 ? "" : "s"}
          </span>
        )}
        {row.openReminderCount > 0 && (
          <span className="mt-0.5 flex items-center gap-0.5 text-(--color-warning-foreground, var(--color-foreground))">
            <Bell className="size-2.5" />
            {row.openReminderCount}
          </span>
        )}
      </td>

      <td
        className="whitespace-nowrap px-2 py-2 align-top"
        title={activity.fullStamp}
        onClick={open}
      >
        <span className="block text-[11px] font-medium tabular-nums leading-tight text-(--color-foreground)">
          {activity.relative}
        </span>
        <span className="block text-[10px] tabular-nums text-(--color-muted-foreground)">
          {activity.shortStamp}
        </span>
      </td>

      <td className="px-1 py-2 align-top text-right" onClick={open}>
        <ChevronRight className="ml-auto size-4 text-(--color-muted-foreground)" />
      </td>
    </tr>
  );
}

function SourceIcon({ source }: { source: "instagram" | "manual" }) {
  if (source === "instagram") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">
        <Instagram className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--color-muted) text-(--color-muted-foreground)">
      <MessageSquare className="size-3.5" />
    </span>
  );
}
