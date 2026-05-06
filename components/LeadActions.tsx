"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/lead-constants";
import type { LeadStatus } from "@/db/schema";

const STATUSES: LeadStatus[] = [
  "new",
  "awaiting_callback",
  "contacted",
  "won",
  "lost",
];

type Props = {
  lead: {
    id: string;
    status: LeadStatus;
    assignedTo: string | null;
    customerName: string | null;
    customerPhone: string | null;
    summary: string | null;
    igUsername: string | null;
    eventDate: string | null;
    guestCount: number | null;
  };
  employees: { id: string; name: string }[];
};

export function LeadActions({ lead, employees }: Props) {
  const [name, setName] = useState(lead.customerName ?? "");
  const [phone, setPhone] = useState(lead.customerPhone ?? "");
  const [igUsername, setIgUsername] = useState(lead.igUsername ?? "");
  const [eventDate, setEventDate] = useState(lead.eventDate ?? "");
  const [guestCount, setGuestCount] = useState<string>(
    lead.guestCount != null ? String(lead.guestCount) : "",
  );
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [assignedTo, setAssignedTo] = useState<string>(
    lead.assignedTo ?? "unassigned",
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function patch(payload: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success(msg);
    startTransition(() => router.refresh());
  }

  function saveDetails() {
    const payload: Record<string, unknown> = {
      customerName: name || null,
      customerPhone: phone || null,
      igUsername: igUsername.trim() || null,
      eventDate: eventDate || null,
    };
    if (guestCount.trim()) {
      const n = Number(guestCount);
      if (!Number.isFinite(n) || n < 1) {
        toast.error("Guest count must be a positive number");
        return;
      }
      payload.guestCount = n;
    } else {
      payload.guestCount = null;
    }
    patch(payload, "Details saved");
  }

  return (
    <div className="w-full space-y-3 sm:w-72">
      <div className="space-y-1.5">
        <Label htmlFor="leadName">Name</Label>
        <Input
          id="leadName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="leadPhone">Phone</Label>
        <Input
          id="leadPhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 …"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="leadIg">Instagram handle</Label>
        <Input
          id="leadIg"
          value={igUsername}
          onChange={(e) => setIgUsername(e.target.value.replace(/^@/, ""))}
          placeholder="priyasharma"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="leadEventDate">Wedding date</Label>
          <Input
            id="leadEventDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="leadGuests">Guests</Label>
          <Input
            id="leadGuests"
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="500"
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={saveDetails}
      >
        <Save className="size-4" />
        Save details
      </Button>

      <div className="space-y-1.5 pt-2">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as LeadStatus);
            patch({ status: v }, "Status updated");
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Assigned to</Label>
        <Select
          value={assignedTo}
          onValueChange={(v) => {
            setAssignedTo(v);
            patch(
              { assignedTo: v === "unassigned" ? null : v },
              "Assignment updated",
            );
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={() => patch({ markContacted: true }, "Marked contacted")}
      >
        <CheckCheck className="size-4" />
        Mark as just contacted
      </Button>
    </div>
  );
}
