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
import { STATUS_LABELS } from "@/lib/lead-constants";
import type { LeadStatus } from "@/db/schema";

const STATUSES: (LeadStatus | "all")[] = [
  "all",
  "new",
  "awaiting_callback",
  "contacted",
  "won",
  "lost",
];
const SOURCES: ("all" | "instagram" | "manual")[] = ["all", "instagram", "manual"];

export function LeadFilters({
  employees,
  current,
}: {
  employees: { id: string; name: string }[];
  current: {
    status: string;
    assignedTo: string;
    source: string;
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

  function update(key: "status" | "assignedTo" | "source", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
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
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={current.status}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "all" ? "All statuses" : STATUS_LABELS[s as LeadStatus]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
