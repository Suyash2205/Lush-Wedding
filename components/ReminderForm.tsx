"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ReminderRow = {
  id: string;
  dueAt: Date | string;
  completed: boolean;
  note: string | null;
  employeeName: string | null;
};

function defaultDueAt() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  d.setMinutes(0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function ReminderForm({
  leadId,
  initial,
}: {
  leadId: string;
  initial: ReminderRow[];
}) {
  const [reminders, setReminders] = useState(initial);
  const [dueAt, setDueAt] = useState(defaultDueAt);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const iso = new Date(dueAt).toISOString();
      const res = await fetch(`/api/leads/${leadId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: iso, note: note || null }),
      });
      if (!res.ok) throw new Error("Failed");
      const { id } = await res.json();
      setReminders((prev) =>
        [
          ...prev,
          {
            id,
            dueAt: new Date(iso),
            completed: false,
            note: note || null,
            employeeName: "You",
          },
        ].sort(
          (a, b) =>
            new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
        ),
      );
      setNote("");
      setDueAt(defaultDueAt());
      toast.success("Reminder set");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(reminderId: string, current: boolean) {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, completed: !current } : r)),
    );
    try {
      await fetch(`/api/leads/${leadId}/reminders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId, completed: !current }),
      });
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={add}
        className="space-y-3 rounded-xl border border-(--color-border) bg-(--color-card) p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="dueAt">When?</Label>
          <Input
            id="dueAt"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reminderNote">Note (optional)</Label>
          <Textarea
            id="reminderNote"
            placeholder="Call Priya again about Nov 15 dates"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>
        <Button type="submit" size="sm" disabled={submitting} className="w-full">
          <Bell className="size-4" />
          {submitting ? "Saving..." : "Set reminder"}
        </Button>
      </form>

      {reminders.length > 0 && (
        <ol className="space-y-2">
          {reminders.map((r) => {
            const due = new Date(r.dueAt);
            const overdue = !r.completed && due.getTime() < Date.now();
            return (
              <li
                key={r.id}
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  r.completed
                    ? "border-(--color-border) bg-(--color-muted)/40 opacity-60"
                    : overdue
                      ? "border-(--color-destructive)/30 bg-(--color-destructive)/5"
                      : "border-(--color-border) bg-(--color-card)"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(r.id, r.completed)}
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                    r.completed
                      ? "border-(--color-success) bg-(--color-success) text-white"
                      : "border-(--color-border) hover:border-(--color-foreground)"
                  }`}
                  aria-label={r.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {r.completed && <Check className="size-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      r.completed ? "line-through" : ""
                    }`}
                  >
                    {format(due, "PPp")}
                    {overdue && !r.completed && (
                      <span className="ml-2 text-xs font-normal text-(--color-destructive)">
                        overdue ({formatDistanceToNow(due, { addSuffix: true })})
                      </span>
                    )}
                  </p>
                  {r.note && (
                    <p className="text-xs text-(--color-muted-foreground)">
                      {r.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
