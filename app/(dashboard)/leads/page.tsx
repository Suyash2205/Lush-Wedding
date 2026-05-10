import {
  listLeads,
  listEmployees,
  getStaleThresholdHours,
  getLeadStats,
  isLeadStale,
} from "@/lib/leads";
import type { LeadStatus } from "@/db/schema";
import { LEAD_STATUSES } from "@/lib/lead-constants";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { LeadFilters } from "@/components/LeadFilters";
import { LeadsTable, type LeadRowData } from "@/components/LeadsTable";
import { LeadStatsBar } from "@/components/LeadStats";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    assignedTo?: string;
    source?: string;
    phone?: string;
    content?: string;
    eventDateFrom?: string;
    eventDateTo?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const phoneParam = params.phone?.trim();
  const hasPhone: "all" | "yes" | "no" =
    phoneParam === "yes" || phoneParam === "no" ? phoneParam : "all";
  const contentParam = params.content?.trim();
  const hasContent: "all" | "yes" | "no" =
    contentParam === "yes" || contentParam === "no" ? contentParam : "all";
  const requestedStatuses = (params.status ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is LeadStatus =>
      LEAD_STATUSES.includes(s as LeadStatus),
    );

  const filter = {
    statuses:
      requestedStatuses.length > 0 && requestedStatuses.length < LEAD_STATUSES.length
        ? requestedStatuses
        : undefined,
    assignedTo: params.assignedTo ?? "all",
    source: (params.source ?? "all") as "instagram" | "manual" | "all",
    hasPhone,
    hasContent,
    eventDateFrom: params.eventDateFrom?.trim() || undefined,
    eventDateTo: params.eventDateTo?.trim() || undefined,
  };

  const [rows, employeeList, thresholdHours, stats] = await Promise.all([
    listLeads(filter),
    listEmployees(),
    getStaleThresholdHours(),
    getLeadStats(),
  ]);

  const enriched: LeadRowData[] = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      stale: await isLeadStale(r.lead, thresholdHours),
    })),
  );
  // Preserve DB order: newest activity first (see listLeads). Stale badges are visual only —
  // re-sorting stale-first made "last update" feel random vs recency.

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-(--color-muted-foreground)">
            {enriched.length} {enriched.length === 1 ? "lead" : "leads"} shown
            {stats.staleCount > 0 && (
              <>
                {" · "}
                <span className="text-(--color-destructive) font-medium">
                  {stats.staleCount} pending follow-up
                </span>
              </>
            )}
          </p>
        </div>
        <AddLeadDialog />
      </div>

      <LeadStatsBar stats={stats} />

      <LeadFilters
        employees={employeeList.map((e) => ({ id: e.id, name: e.name }))}
        current={{
          statuses: filter.statuses ?? [],
          assignedTo: filter.assignedTo,
          source: filter.source,
          phone: filter.hasPhone,
          content: filter.hasContent,
          eventDateFrom: filter.eventDateFrom ?? "",
          eventDateTo: filter.eventDateTo ?? "",
        }}
      />

      {enriched.length === 0 ? (
        <div className="rounded-xl border border-dashed border-(--color-border) p-12 text-center">
          <p className="text-sm text-(--color-muted-foreground)">
            No leads match this filter. They will appear here when customers DM
            your Instagram or you add one manually.
          </p>
        </div>
      ) : (
        <LeadsTable
          rows={enriched}
          employees={employeeList.map((e) => ({ id: e.id, name: e.name }))}
        />
      )}
    </div>
  );
}
