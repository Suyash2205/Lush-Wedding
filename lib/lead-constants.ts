import type { LeadStatus } from "@/db/schema";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  awaiting_callback: "Awaiting callback",
  contacted: "Contacted",
  won: "Won",
  lost: "Lost",
};
