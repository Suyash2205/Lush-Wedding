"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/db/schema";

export function TeamTable({
  initial,
  currentEmployeeId,
}: {
  initial: Employee[];
  currentEmployeeId: string;
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function setRole(id: string, role: "owner" | "agent") {
    setBusy(id);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setRows((p) => p.map((e) => (e.id === id ? { ...e, role } : e)));
      toast.success("Role updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-card)">
      <table className="w-full">
        <thead className="bg-(--color-muted) text-xs uppercase text-(--color-muted-foreground)">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Role</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-(--color-border)">
              <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
              <td className="px-4 py-3 text-sm text-(--color-muted-foreground)">
                {e.email}
              </td>
              <td className="px-4 py-3">
                <Badge variant={e.role === "owner" ? "primary" : "outline"}>
                  {e.role}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                {e.id === currentEmployeeId ? (
                  <span className="text-xs text-(--color-muted-foreground)">you</span>
                ) : e.role === "agent" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === e.id}
                    onClick={() => setRole(e.id, "owner")}
                  >
                    Promote to owner
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === e.id}
                    onClick={() => setRole(e.id, "agent")}
                  >
                    Demote to agent
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
