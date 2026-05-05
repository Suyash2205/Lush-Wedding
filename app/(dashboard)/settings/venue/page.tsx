import { redirect } from "next/navigation";
import { db } from "@/db";
import { venueInfo, appSettings } from "@/db/schema";
import { getOrCreateEmployee } from "@/lib/auth";
import { VenueSettingsForm } from "@/components/VenueSettingsForm";

const KEYS = [
  {
    key: "venue_name",
    label: "Venue name",
    placeholder: "Lush Wedding Hall",
    rows: 1,
    helper: "Used in emails and the dashboard.",
  },
  {
    key: "lawn_capacity",
    label: "Lawn capacity",
    placeholder:
      "Our main lawn comfortably hosts up to 800 guests seated, or 1200 standing.",
    rows: 3,
    helper: "Answer for the IG FAQ 'What is the capacity?'",
  },
  {
    key: "catering",
    label: "Catering",
    placeholder:
      "Yes, in-house catering is available with both vegetarian and non-vegetarian menus.",
    rows: 3,
    helper: "Answer for the IG FAQ 'Do you do catering?'",
  },
  {
    key: "location",
    label: "Location",
    placeholder:
      "Lush Wedding Hall, [Address]. Google Maps: https://maps.google.com/?q=YourVenue",
    rows: 3,
    helper: "Answer for the IG FAQ 'Where are you located?'",
  },
] as const;

export default async function VenueSettingsPage() {
  const employee = await getOrCreateEmployee();
  if (!employee || employee.role !== "owner") redirect("/leads");

  const rows = await db.select().from(venueInfo);
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const stale = await db.select().from(appSettings);
  const staleMap = new Map(stale.map((r) => [r.key, r.value]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Venue info</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          The single source of truth for the 3 questions Instagram FAQs answer.
          Edit here, then copy-paste into Instagram (Profile &rarr; Settings &rarr;
          Business tools &rarr; Frequently Asked Questions).
        </p>
      </div>

      <VenueSettingsForm
        keys={KEYS as unknown as { key: string; label: string; placeholder: string; rows: number; helper: string }[]}
        values={Object.fromEntries(map.entries())}
        staleHours={staleMap.get("stale_threshold_hours") ?? "2"}
        notificationEmail={staleMap.get("owner_notification_email") ?? ""}
      />
    </div>
  );
}
