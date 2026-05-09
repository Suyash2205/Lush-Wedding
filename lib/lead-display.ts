import type { Lead } from "@/db/schema";

/**
 * Visible title for lists and headings. Prefers manual name, then @handle from DB,
 * then a short Instagram-scoped id label (never "Unknown" for real IG webhook leads).
 */
export function primaryLeadTitle(
  lead: Pick<Lead, "source" | "customerName" | "igUsername" | "igUserId">,
): string {
  const cn = lead.customerName?.trim();
  if (cn) return cn;

  const user = lead.igUsername?.replace(/^@/, "").trim();
  if (user) return `@${user}`;

  if (lead.source === "instagram" && lead.igUserId?.trim()) {
    const id = lead.igUserId.trim();
    const short =
      id.length > 12 ? `${id.slice(0, 4)}\u2026${id.slice(-4)}` : id;
    return `Instagram ${short}`;
  }

  return lead.source === "instagram" ? "Instagram lead" : "Unknown lead";
}

/** Secondary line under the title (phone vs handle); avoids duplicating @ if it's already the title */
export function shouldShowInstagramHandleInSubtitle(
  lead: Pick<Lead, "igUsername">,
  title: string,
): boolean {
  const user = lead.igUsername?.replace(/^@/, "").trim();
  if (!user) return false;
  if (title === `@${user}`) return false;
  return true;
}
