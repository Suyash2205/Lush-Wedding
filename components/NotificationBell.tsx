"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type Counts = { stale: number; reminders: number };

export function NotificationBell() {
  const [counts, setCounts] = useState<Counts>({ stale: 0, reminders: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as Counts;
        if (!cancelled) setCounts(data);
      } catch {
        // silent
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const total = counts.stale + counts.reminders;

  return (
    <Link
      href="/leads?status=new"
      className="relative rounded-md p-2 text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
      title={`${counts.stale} stale leads, ${counts.reminders} reminders due`}
    >
      <Bell className="size-5" />
      {total > 0 && (
        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-(--color-destructive) text-[10px] font-bold text-white">
          {total > 9 ? "9+" : total}
        </span>
      )}
    </Link>
  );
}
