import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/lead-constants";
import type { LeadStatus } from "@/db/schema";

const variants: Record<LeadStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  new: "primary",
  awaiting_callback: "warning",
  tentative: "outline",
  very_positive: "success",
  contacted: "outline",
  won: "success",
  lost: "destructive",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>;
}
