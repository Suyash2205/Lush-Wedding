import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, type Employee } from "@/db/schema";

/**
 * Returns the Employee row for the current Clerk user, creating one if it doesn't
 * exist yet. The very first user to sign in becomes `owner`; everyone else
 * becomes `agent` until promoted.
 */
export async function getOrCreateEmployee(): Promise<Employee | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db
    .select()
    .from(employees)
    .where(eq(employees.clerkUserId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const user = await currentUser();
  if (!user) return null;

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    `${userId}@unknown.local`;
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email.split("@")[0];

  const ownerCount = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.role, "owner"))
    .limit(1);
  const role = ownerCount.length === 0 ? "owner" : "agent";

  const inserted = await db
    .insert(employees)
    .values({
      clerkUserId: userId,
      name,
      email,
      role,
    })
    .onConflictDoNothing({ target: employees.clerkUserId })
    .returning();

  if (inserted[0]) return inserted[0];

  const refetch = await db
    .select()
    .from(employees)
    .where(eq(employees.clerkUserId, userId))
    .limit(1);
  return refetch[0] ?? null;
}

export async function requireEmployee(): Promise<Employee> {
  const employee = await getOrCreateEmployee();
  if (!employee) {
    throw new Error("Unauthenticated");
  }
  return employee;
}

export async function requireOwner(): Promise<Employee> {
  const employee = await requireEmployee();
  if (employee.role !== "owner") {
    throw new Error("Forbidden: owner only");
  }
  return employee;
}
