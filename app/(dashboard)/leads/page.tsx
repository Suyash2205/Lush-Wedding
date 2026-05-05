import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Instagram, MessageSquare, Phone, UserRound } from "lucide-react";
import {
  listLeads,
  listEmployees,
  getStaleThresholdHours,
  isLeadStale,
  STATUS_LABELS,
} from "@/lib/leads";
import type { LeadStatus } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { LeadFilters } from "@/components/LeadFilters";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPhone, truncate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    assignedTo?: string;
    source?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filter = {
    status: (params.status ?? "all") as LeadStatus | "all",
    assignedTo: params.assignedTo ?? "all",
    source: (params.source ?? "all") as "instagram" | "manual" | "all",
  };

  const [rows, employeeList, thresholdHours] = await Promise.all([
    listLeads(filter),
    listEmployees(),
    getStaleThresholdHours(),
  ]);

  const sorted = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      stale: await isLeadStale(r.lead, thresholdHours),
    })),
  );
  sorted.sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? -1 : 1;
    return 0;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-(--color-muted-foreground)">
            {sorted.length} {sorted.length === 1 ? "lead" : "leads"}
            {sorted.some((s) => s.stale) && (
              <>
                {" · "}
                <span className="text-(--color-destructive) font-medium">
                  {sorted.filter((s) => s.stale).length} pending follow-up
                </span>
              </>
            )}
          </p>
        </div>
        <AddLeadDialog />
      </div>

      <LeadFilters
        employees={employeeList.map((e) => ({ id: e.id, name: e.name }))}
        current={filter}
      />

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-(--color-border) p-12 text-center">
          <p className="text-sm text-(--color-muted-foreground)">
            No leads yet. They will appear here when customers DM your Instagram or you
            add one manually.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-card)">
          <table className="w-full">
            <thead className="bg-(--color-muted) text-xs uppercase text-(--color-muted-foreground)">
              <tr>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="hidden px-4 py-2 text-left md:table-cell">
                  Summary
                </th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="hidden px-4 py-2 text-left lg:table-cell">
                  Assigned
                </th>
                <th className="px-4 py-2 text-left">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ lead, assignee, stale }) => (
                <tr
                  key={lead.id}
                  className="border-t border-(--color-border) transition-colors hover:bg-(--color-muted)/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-start gap-3"
                    >
                      <SourceIcon source={lead.source} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          {lead.customerName ||
                            lead.igUsername ||
                            "Unknown lead"}
                          {stale && (
                            <Badge variant="destructive" className="text-[10px]">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-(--color-muted-foreground)">
                          {lead.customerPhone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {formatPhone(lead.customerPhone)}
                            </span>
                          ) : lead.igUsername ? (
                            <span>@{lead.igUsername}</span>
                          ) : (
                            <span className="italic">No contact yet</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden max-w-[280px] truncate px-4 py-3 text-sm text-(--color-muted-foreground) md:table-cell">
                    {lead.summary ? truncate(lead.summary, 90) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-sm lg:table-cell">
                    {assignee ? (
                      <span className="flex items-center gap-1">
                        <UserRound className="size-3" />
                        {assignee.name}
                      </span>
                    ) : (
                      <span className="text-(--color-muted-foreground)">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-(--color-muted-foreground)">
                    {formatDistanceToNow(
                      new Date(lead.lastInboundAt ?? lead.createdAt),
                      { addSuffix: true },
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

void STATUS_LABELS;
