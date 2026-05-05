"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  rows: number;
  helper: string;
};

export function VenueSettingsForm({
  keys,
  values,
  staleHours,
  notificationEmail,
}: {
  keys: FieldDef[];
  values: Record<string, string | undefined>;
  staleHours: string;
  notificationEmail: string;
}) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const k of keys) out[k.key] = values[k.key] ?? "";
    return out;
  });
  const [hours, setHours] = useState(staleHours);
  const [email, setEmail] = useState(notificationEmail);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/venue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: v,
          staleThresholdHours: hours,
          notificationEmail: email,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  const igFaqText = [
    `Q: What is the lawn capacity?`,
    `A: ${v.lawn_capacity || "(set me in venue settings)"}`,
    ``,
    `Q: Do you do catering?`,
    `A: ${v.catering || "(set me in venue settings)"}`,
    ``,
    `Q: Where are you located?`,
    `A: ${v.location || "(set me in venue settings)"}`,
  ].join("\n");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Venue details</CardTitle>
          <CardDescription>
            These are the canonical answers your team will use, and the basis of
            the Instagram FAQs your customers will see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.map((k) => (
            <div key={k.key} className="space-y-1.5">
              <Label htmlFor={k.key}>{k.label}</Label>
              {k.rows === 1 ? (
                <Input
                  id={k.key}
                  value={v[k.key] ?? ""}
                  placeholder={k.placeholder}
                  onChange={(e) =>
                    setV((p) => ({ ...p, [k.key]: e.target.value }))
                  }
                />
              ) : (
                <Textarea
                  id={k.key}
                  rows={k.rows}
                  value={v[k.key] ?? ""}
                  placeholder={k.placeholder}
                  onChange={(e) =>
                    setV((p) => ({ ...p, [k.key]: e.target.value }))
                  }
                />
              )}
              <p className="text-xs text-(--color-muted-foreground)">{k.helper}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stale-lead alerts</CardTitle>
          <CardDescription>
            Leads that have not been contacted within this window get a red
            &ldquo;Pending&rdquo; badge and trigger an email digest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hours">Threshold (hours)</Label>
            <Input
              id="hours"
              type="number"
              min={1}
              max={168}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Owner notification email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              placeholder="owner@your-domain.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-(--color-muted-foreground)">
              Hourly digest emails go here. Leave blank to disable.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instagram FAQ — copy &amp; paste</CardTitle>
          <CardDescription>
            Open Instagram on your phone &rarr; Profile &rarr; Settings and Privacy
            &rarr; Business Tools and Controls &rarr; Frequently Asked Questions.
            Add these three Q/A pairs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md border border-(--color-border) bg-(--color-muted) p-3 text-xs">
            {igFaqText}
          </pre>
          <Button size="sm" variant="outline" onClick={() => copy(igFaqText)}>
            <Copy className="size-4" />
            Copy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
