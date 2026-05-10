"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/lead-constants";
import type { LeadStatus } from "@/db/schema";

const SOURCES: ("all" | "instagram" | "manual")[] = ["all", "instagram", "manual"];

export function LeadFilters({
  employees,
  current,
}: {
  employees: { id: string; name: string }[];
  current: {
    statuses: LeadStatus[];
    assignedTo: string;
    source: string;
    phone: string;
    content: string;
    eventDateFrom: string;
    eventDateTo: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function push(next: URLSearchParams) {
    const q = next.toString();
    router.push(q ? `/leads?${q}` : "/leads");
  }

  function update(key: "assignedTo" | "source" | "phone" | "content", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    push(next);
  }

  function toggleStatus(status: LeadStatus) {
    const next = new URLSearchParams(params.toString());
    const currentRaw = next.get("status") ?? "";
    const set = new Set(
      currentRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (set.has(status)) set.delete(status);
    else set.add(status);

    const values = LEAD_STATUSES.filter((s) => set.has(s));
    if (values.length === 0 || values.length === LEAD_STATUSES.length) {
      next.delete("status");
    } else {
      next.set("status", values.join(","));
    }
    push(next);
  }

  function setEventDateFrom(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("eventDateFrom", value);
    else next.delete("eventDateFrom");
    push(next);
  }

  function setEventDateTo(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("eventDateTo", value);
    else next.delete("eventDateTo");
    push(next);
  }

  function clearEventDateRange() {
    const next = new URLSearchParams(params.toString());
    next.delete("eventDateFrom");
    next.delete("eventDateTo");
    push(next);
  }

  const hasEventRange = Boolean(
    current.eventDateFrom || current.eventDateTo,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-(--color-border) p-2">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-(--color-muted-foreground)">
          Status (multi-select)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUSES.map((s) => {
            const selected = current.statuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  selected
                    ? "border-(--color-primary) bg-(--color-primary)/10 text-(--color-foreground)"
                    : "border-(--color-border) text-(--color-muted-foreground) hover:bg-(--color-muted)"
                }`}
                aria-pressed={selected}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
          {current.statuses.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-(--color-muted-foreground)"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.delete("status");
                push(next);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">

      <Select
        value={current.assignedTo}
        onValueChange={(v) => update("assignedTo", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Anyone</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={current.source}
        onValueChange={(v) => update("source", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "all"
                ? "All sources"
                : s === "instagram"
                  ? "Instagram"
                  : "Manual"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={current.phone}
        onValueChange={(v) => update("phone", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Phone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All leads</SelectItem>
          <SelectItem value="yes">Has phone</SelectItem>
          <SelectItem value="no">No phone</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={current.content}
        onValueChange={(v) => update("content", v)}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Content" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All content</SelectItem>
          <SelectItem value="yes">Has content</SelectItem>
          <SelectItem value="no">No content</SelectItem>
        </SelectContent>
      </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-(--color-border) pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-(--color-muted-foreground)">
          Event date range
        </span>
        <Input
          type="date"
          aria-label="Event date from"
          className="w-[150px]"
          value={current.eventDateFrom}
          onChange={(e) => setEventDateFrom(e.target.value)}
        />
        <span className="text-xs text-(--color-muted-foreground)">to</span>
        <Input
          type="date"
          aria-label="Event date to"
          className="w-[150px]"
          value={current.eventDateTo}
          onChange={(e) => setEventDateTo(e.target.value)}
        />
        {hasEventRange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-(--color-muted-foreground)"
            onClick={clearEventDateRange}
          >
            Clear dates
          </Button>
        )}
      </div>
    </div>
  );
}
