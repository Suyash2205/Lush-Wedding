import type { LeadStatus } from "@/db/schema";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "awaiting_callback",
  "tentative",
  "very_positive",
  "contacted",
  "won",
  "lost",
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  awaiting_callback: "Awaiting callback",
  tentative: "Tentative",
  very_positive: "Very positive",
  contacted: "Contacted",
  won: "Won",
  lost: "Lost",
};
