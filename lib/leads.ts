import "server-only";
import { and, desc, eq, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leads,
  messages,
  comments,
  reminders,
  employees,
  appSettings,
  type Lead,
  type LeadStatus,
} from "@/db/schema";

void gte;

export { STATUS_LABELS } from "./lead-constants";

export async function getStaleThresholdHours(): Promise<number> {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "stale_threshold_hours"))
    .limit(1);
  const v = row[0]?.value;
  if (!v) return 2;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export async function getOwnerNotificationEmail(): Promise<string> {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "owner_notification_email"))
    .limit(1);
  return row[0]?.value ?? process.env.OWNER_NOTIFICATION_EMAIL ?? "";
}

export type LeadFilter = {
  status?: LeadStatus | "all";
  assignedTo?: string | "all";
  source?: "instagram" | "manual" | "all";
};

export async function listLeads(filter: LeadFilter = {}) {
  const conds = [] as ReturnType<typeof eq>[];
  if (filter.status && filter.status !== "all") {
    conds.push(eq(leads.status, filter.status));
  }
  if (filter.assignedTo && filter.assignedTo !== "all") {
    if (filter.assignedTo === "unassigned") {
      conds.push(isNull(leads.assignedTo) as never);
    } else {
      conds.push(eq(leads.assignedTo, filter.assignedTo));
    }
  }
  if (filter.source && filter.source !== "all") {
    conds.push(eq(leads.source, filter.source));
  }

  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      lead: leads,
      assignee: employees,
      messageCount: sql<number>`(
        SELECT count(*)::int FROM ${messages} WHERE ${messages.leadId} = ${leads.id}
      )`,
      commentCount: sql<number>`(
        SELECT count(*)::int FROM ${comments} WHERE ${comments.leadId} = ${leads.id}
      )`,
      openReminderCount: sql<number>`(
        SELECT count(*)::int FROM ${reminders}
        WHERE ${reminders.leadId} = ${leads.id} AND ${reminders.completed} = false
      )`,
    })
    .from(leads)
    .leftJoin(employees, eq(leads.assignedTo, employees.id))
    .where(where)
    .orderBy(desc(leads.lastInboundAt), desc(leads.createdAt));

  return rows;
}

export type LeadStats = {
  total: number;
  newCount: number;
  awaitingCount: number;
  contactedCount: number;
  wonCount: number;
  lostCount: number;
  unassignedCount: number;
  todayCount: number;
  staleCount: number;
};

export async function getLeadStats(): Promise<LeadStats> {
  const thresholdHours = await getStaleThresholdHours();
  const cutoff = new Date(Date.now() - thresholdHours * 3600_000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      newCount: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'new')::int`,
      awaitingCount: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'awaiting_callback')::int`,
      contactedCount: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'contacted')::int`,
      wonCount: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'won')::int`,
      lostCount: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'lost')::int`,
      unassignedCount: sql<number>`count(*) FILTER (WHERE ${leads.assignedTo} IS NULL)::int`,
      todayCount: sql<number>`count(*) FILTER (WHERE ${leads.createdAt} >= ${startOfToday.toISOString()})::int`,
      staleCount: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'new' AND (
        (${leads.lastInboundAt} IS NULL AND ${leads.createdAt} < ${cutoff.toISOString()})
        OR ${leads.lastInboundAt} < ${cutoff.toISOString()}
      ))::int`,
    })
    .from(leads);

  const r = rows[0];
  return {
    total: Number(r?.total ?? 0),
    newCount: Number(r?.newCount ?? 0),
    awaitingCount: Number(r?.awaitingCount ?? 0),
    contactedCount: Number(r?.contactedCount ?? 0),
    wonCount: Number(r?.wonCount ?? 0),
    lostCount: Number(r?.lostCount ?? 0),
    unassignedCount: Number(r?.unassignedCount ?? 0),
    todayCount: Number(r?.todayCount ?? 0),
    staleCount: Number(r?.staleCount ?? 0),
  };
}

export async function isLeadStale(
  lead: Lead,
  thresholdHours: number,
): Promise<boolean> {
  if (lead.status !== "new") return false;
  if (!lead.lastInboundAt) {
    const created = new Date(lead.createdAt).getTime();
    return Date.now() - created > thresholdHours * 3600_000;
  }
  return (
    Date.now() - new Date(lead.lastInboundAt).getTime() >
    thresholdHours * 3600_000
  );
}

export async function getLeadDetail(id: string) {
  const leadRow = await db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      assignedTo: true,
    },
  });
  if (!leadRow) return null;

  const [msgs, cmts, rems] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.leadId, id))
      .orderBy(messages.createdAt),
    db
      .select({
        id: comments.id,
        leadId: comments.leadId,
        body: comments.body,
        createdAt: comments.createdAt,
        employeeId: comments.employeeId,
        employeeName: employees.name,
      })
      .from(comments)
      .leftJoin(employees, eq(comments.employeeId, employees.id))
      .where(eq(comments.leadId, id))
      .orderBy(desc(comments.createdAt)),
    db
      .select({
        id: reminders.id,
        leadId: reminders.leadId,
        dueAt: reminders.dueAt,
        completed: reminders.completed,
        note: reminders.note,
        createdAt: reminders.createdAt,
        employeeId: reminders.employeeId,
        employeeName: employees.name,
      })
      .from(reminders)
      .leftJoin(employees, eq(reminders.employeeId, employees.id))
      .where(eq(reminders.leadId, id))
      .orderBy(reminders.dueAt),
  ]);

  return {
    lead: leadRow,
    messages: msgs,
    comments: cmts,
    reminders: rems,
  };
}

export async function listEmployees() {
  return db.select().from(employees).orderBy(employees.name);
}

export async function countNotifications() {
  const thresholdHours = await getStaleThresholdHours();
  const cutoff = new Date(Date.now() - thresholdHours * 3600_000);
  const now = new Date();

  const stale = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(
      and(
        eq(leads.status, "new"),
        or(
          and(
            isNull(leads.lastInboundAt),
            lt(leads.createdAt, cutoff),
          ),
          lt(leads.lastInboundAt, cutoff),
        ),
      ),
    );

  const dueReminders = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reminders)
    .where(and(eq(reminders.completed, false), lte(reminders.dueAt, now)));

  return {
    stale: Number(stale[0]?.count ?? 0),
    reminders: Number(dueReminders[0]?.count ?? 0),
  };
}
