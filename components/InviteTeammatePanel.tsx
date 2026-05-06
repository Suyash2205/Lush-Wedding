"use client";

import { useState } from "react";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InviteTeammatePanel() {
  const [signUpUrl, setSignUpUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  if (typeof window !== "undefined" && !signUpUrl) {
    setSignUpUrl(`${window.location.origin}/sign-up`);
  }

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-card) p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--color-primary)/10 text-(--color-primary)">
          <LinkIcon className="size-4" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Invite a teammate or co-owner</h2>
            <p className="mt-1 text-xs text-(--color-muted-foreground)">
              Anyone you share this link with can sign up with their own email +
              password (or Google) and they&apos;ll appear in the table below as
              an <span className="font-medium">agent</span>. To give them full
              access (settings, team, integrations), promote them to{" "}
              <span className="font-medium">owner</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-md border border-(--color-border) bg-(--color-muted) px-3 py-2 text-xs">
              {signUpUrl || "Loading…"}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(signUpUrl, "url")}
              disabled={!signUpUrl}
            >
              {copied === "url" ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              Copy invite link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
