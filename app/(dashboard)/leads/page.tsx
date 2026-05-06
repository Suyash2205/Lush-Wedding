import {
  listLeads,
  listEmployees,
  getStaleThresholdHours,
  getLeadStats,
  isLeadStale,
} from "@/lib/leads";
import type { LeadStatus } from "@/db/schema";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { LeadFilters } from "@/components/LeadFilters";
import { LeadsTable, type LeadRowData } from "@/components/LeadsTable";
import { LeadStatsBar } from "@/components/LeadStats";

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
  enriched.sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? -1 : 1;
    return 0;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
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
        current={filter}
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
