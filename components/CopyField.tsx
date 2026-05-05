"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className="flex h-9 flex-1 rounded-md border border-(--color-border) bg-(--color-muted) px-3 py-1 text-xs"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
          aria-label="Copy"
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}
