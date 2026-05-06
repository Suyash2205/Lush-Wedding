import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  date,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const leadSourceEnum = pgEnum("lead_source", ["instagram", "manual"]);
export const messageDirectionEnum = pgEnum("message_direction", ["in", "out"]);
export const messageSourceEnum = pgEnum("message_source", [
  "instagram",
  "manual",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "awaiting_callback",
  "contacted",
  "won",
  "lost",
]);
export const employeeRoleEnum = pgEnum("employee_role", ["owner", "agent"]);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: employeeRoleEnum("role").notNull().default("agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("employees_clerk_user_id_key").on(t.clerkUserId),
    uniqueIndex("employees_email_key").on(t.email),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: leadSourceEnum("source").notNull(),
    igUserId: text("ig_user_id"),
    igUsername: text("ig_username"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    summary: text("summary"),
    eventDate: date("event_date"),
    guestCount: integer("guest_count"),
    status: leadStatusEnum("status").notNull().default("new"),
    assignedTo: uuid("assigned_to").references(() => employees.id, {
      onDelete: "set null",
    }),
    lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    staleNotifiedAt: timestamp("stale_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("leads_ig_user_id_key").on(t.igUserId),
    index("leads_status_idx").on(t.status),
    index("leads_last_inbound_idx").on(t.lastInboundAt),
    index("leads_assigned_to_idx").on(t.assignedTo),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    direction: messageDirectionEnum("direction").notNull(),
    source: messageSourceEnum("source").notNull(),
    content: text("content").notNull(),
    igMessageId: text("ig_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("messages_ig_message_id_key").on(t.igMessageId),
    index("messages_lead_id_idx").on(t.leadId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_lead_id_idx").on(t.leadId)],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completed: boolean("completed").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reminders_lead_id_idx").on(t.leadId),
    index("reminders_due_idx").on(t.dueAt),
  ],
);

export const venueInfo = pgTable(
  "venue_info",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const appSettings = pgTable(
  "app_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedTo: one(employees, {
    fields: [leads.assignedTo],
    references: [employees.id],
  }),
  messages: many(messages),
  comments: many(comments),
  reminders: many(reminders),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  lead: one(leads, {
    fields: [messages.leadId],
    references: [leads.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  lead: one(leads, {
    fields: [comments.leadId],
    references: [leads.id],
  }),
  employee: one(employees, {
    fields: [comments.employeeId],
    references: [employees.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  lead: one(leads, {
    fields: [reminders.leadId],
    references: [leads.id],
  }),
  employee: one(employees, {
    fields: [reminders.employeeId],
    references: [employees.id],
  }),
}));

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];

// Suppress unused-warning for sql import retained for migration helpers later
void sql;
void primaryKey;
