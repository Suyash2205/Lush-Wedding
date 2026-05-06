import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Phone, Users } from "lucide-react";
import { format } from "date-fns";
import { getLeadDetail, listEmployees } from "@/lib/leads";
import { formatPhone } from "@/lib/utils";
import { ChatTranscript } from "@/components/ChatTranscript";
import { CommentList } from "@/components/CommentList";
import { ReminderForm } from "@/components/ReminderForm";
import { LeadActions } from "@/components/LeadActions";
import { StatusBadge } from "@/components/StatusBadge";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getLeadDetail(id);
  if (!detail) notFound();

  const employees = await listEmployees();
  const { lead, messages, comments, reminders } = detail;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-(--color-muted-foreground) hover:text-(--color-foreground)"
      >
        <ArrowLeft className="size-4" /> Back to leads
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-card) p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">
              {lead.customerName || lead.igUsername || "Unknown lead"}
            </h1>
            <StatusBadge status={lead.status} />
            {lead.source === "instagram" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-pink-100 px-2 py-0.5 text-xs text-pink-700">
                Instagram
              </span>
            )}
          </div>
          {lead.summary && (
            <p className="max-w-prose text-sm text-(--color-muted-foreground)">
              {lead.summary}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {lead.customerPhone ? (
              <a
                href={`tel:${lead.customerPhone}`}
                className="flex items-center gap-1.5 text-(--color-primary) hover:underline"
              >
                <Phone className="size-4" />
                {formatPhone(lead.customerPhone)}
              </a>
            ) : (
              <span className="text-(--color-muted-foreground)">
                No phone number captured yet — ask in the DM thread.
              </span>
            )}
            {lead.igUsername && (
              <a
                href={`https://instagram.com/${lead.igUsername}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-(--color-muted-foreground) hover:text-(--color-foreground)"
              >
                @{lead.igUsername}
                <ExternalLink className="size-3" />
              </a>
            )}
            {lead.eventDate && (
              <span className="flex items-center gap-1.5 text-(--color-muted-foreground)">
                <CalendarDays className="size-4" />
                {format(new Date(lead.eventDate), "PPP")}
              </span>
            )}
            {lead.guestCount != null && (
              <span className="flex items-center gap-1.5 text-(--color-muted-foreground)">
                <Users className="size-4" />
                {lead.guestCount} guests
              </span>
            )}
          </div>
          <div className="text-xs text-(--color-muted-foreground)">
            Created {format(new Date(lead.createdAt), "PPp")}
            {lead.lastContactedAt && (
              <>
                {" · "}Last contacted{" "}
                {format(new Date(lead.lastContactedAt), "PPp")}
              </>
            )}
          </div>
        </div>
        <LeadActions
          lead={{
            id: lead.id,
            status: lead.status,
            assignedTo: lead.assignedTo?.id ?? null,
            customerName: lead.customerName,
            customerPhone: lead.customerPhone,
            summary: lead.summary,
            igUsername: lead.igUsername,
            eventDate: lead.eventDate,
            guestCount: lead.guestCount,
          }}
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              Conversation
            </h2>
            <ChatTranscript messages={messages} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
              Internal notes
            </h2>
            <CommentList leadId={lead.id} initial={comments} />
          </section>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
            Reminders
          </h2>
          <ReminderForm leadId={lead.id} initial={reminders} />
        </aside>
      </div>
    </div>
  );
}
