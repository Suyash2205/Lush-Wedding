import { redirect } from "next/navigation";
import { getOrCreateEmployee } from "@/lib/auth";
import { listEmployees } from "@/lib/leads";
import { TeamTable } from "@/components/TeamTable";
import { InviteTeammatePanel } from "@/components/InviteTeammatePanel";

export default async function TeamSettingsPage() {
  const me = await getOrCreateEmployee();
  if (!me || me.role !== "owner") redirect("/leads");

  const employees = await listEmployees();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Owners can do everything. Agents can read leads, add notes, set
          reminders, and update status — but cannot change settings, venue
          info, integrations, or team roles.
        </p>
      </div>
      <InviteTeammatePanel />
      <TeamTable initial={employees} currentEmployeeId={me.id} />
    </div>
  );
}
