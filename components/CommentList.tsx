"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date | string;
  employeeName: string | null;
};

export function CommentList({
  leadId,
  initial,
}: {
  leadId: string;
  initial: CommentRow[];
}) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed");
      const { id } = await res.json();
      setComments((prev) => [
        {
          id,
          body,
          createdAt: new Date(),
          employeeName: "You",
        },
        ...prev,
      ]);
      setBody("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="space-y-2">
        <Textarea
          placeholder="e.g. Called Priya — wants 600 guests in November, will email by Friday"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {submitting ? "Saving..." : "Add note"}
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-md border border-dashed border-(--color-border) p-4 text-center text-sm text-(--color-muted-foreground)">
          No notes yet. Log call notes here so the team can pick up where you left off.
        </p>
      ) : (
        <ol className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-(--color-border) bg-(--color-card) p-3"
            >
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              <p className="mt-1 text-xs text-(--color-muted-foreground)">
                {c.employeeName ?? "Unknown"} ·{" "}
                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
