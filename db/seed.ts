import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });
import { db } from "./index";
import { venueInfo, appSettings } from "./schema";

async function main() {
  console.log("Seeding venue_info defaults...");
  await db
    .insert(venueInfo)
    .values([
      {
        key: "lawn_capacity",
        value: "Our main lawn comfortably hosts up to 800 guests seated, or 1200 standing.",
      },
      {
        key: "catering",
        value:
          "Yes, in-house catering is available with both vegetarian and non-vegetarian menus. Outside caterers can also be allowed on request.",
      },
      {
        key: "location",
        value:
          "Lush Wedding Hall, [Your Address Here]. Google Maps: https://maps.google.com/?q=YourVenue",
      },
      {
        key: "venue_name",
        value: "Lush Wedding Hall",
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding app_settings defaults...");
  await db
    .insert(appSettings)
    .values([
      { key: "stale_threshold_hours", value: "2" },
      { key: "owner_notification_email", value: "" },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
