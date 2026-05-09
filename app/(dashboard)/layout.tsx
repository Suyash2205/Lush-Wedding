import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Inbox, Settings, Users, Plug, Heart } from "lucide-react";
import { getOrCreateEmployee } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await getOrCreateEmployee();
  const isOwner = employee?.role === "owner";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-(--color-border) bg-(--color-background)/80 px-4 backdrop-blur md:px-6">
        <Link href="/leads" className="flex items-center gap-2 font-semibold">
          <Heart className="size-5 text-(--color-primary)" />
          <span>Lush Wedding Leads</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/leads" icon={<Inbox className="size-4" />}>
            Leads
          </NavLink>
          {isOwner && (
            <>
              <NavLink href="/settings/venue" icon={<Settings className="size-4" />}>
                Venue
              </NavLink>
              <NavLink href="/settings/team" icon={<Users className="size-4" />}>
                Team
              </NavLink>
              <NavLink
                href="/settings/integration"
                icon={<Plug className="size-4" />}
              >
                Integration
              </NavLink>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <NotificationBell />
          {employee && (
            <span className="hidden text-xs text-(--color-muted-foreground) sm:inline">
              {employee.name} {employee.role === "owner" ? "(owner)" : ""}
            </span>
          )}
          <UserButton />
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      <nav className="sticky bottom-0 z-30 flex items-center justify-around border-t border-(--color-border) bg-(--color-background) px-2 py-1 md:hidden">
        <MobileNavLink href="/leads" icon={<Inbox className="size-5" />} label="Leads" />
        {isOwner && (
          <>
            <MobileNavLink
              href="/settings/venue"
              icon={<Settings className="size-5" />}
              label="Venue"
            />
            <MobileNavLink
              href="/settings/team"
              icon={<Users className="size-5" />}
              label="Team"
            />
            <MobileNavLink
              href="/settings/integration"
              icon={<Plug className="size-5" />}
              label="Setup"
            />
          </>
        )}
      </nav>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[10px] font-medium text-(--color-muted-foreground) hover:text-(--color-foreground)"
    >
      {icon}
      {label}
    </Link>
  );
}
