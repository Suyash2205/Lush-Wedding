import { redirect } from "next/navigation";
import { getOrCreateEmployee } from "@/lib/auth";
import { listEmployees } from "@/lib/leads";
import { TeamTable } from "@/components/TeamTable";

export default async function TeamSettingsPage() {
  const me = await getOrCreateEmployee();
  if (!me || me.role !== "owner") redirect("/leads");

  const employees = await listEmployees();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Anyone who signs in via Clerk gets an account here. The first person
          to sign in becomes the owner; everyone else starts as an agent. Promote
          or demote below.
        </p>
      </div>
      <TeamTable initial={employees} currentEmployeeId={me.id} />
    </div>
  );
}
