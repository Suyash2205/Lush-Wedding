"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  current: { status: string; assignedTo: string; source: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: "status" | "assignedTo" | "source", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/leads?${next.toString()}`);
  }

  return (
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
  );
}
