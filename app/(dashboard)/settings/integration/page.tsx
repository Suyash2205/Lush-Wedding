import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { headers } from "next/headers";
import { getOrCreateEmployee } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/CopyField";
import { RefreshInstagramHandlesButton } from "@/components/RefreshInstagramHandlesButton";

export default async function IntegrationSettingsPage() {
  const me = await getOrCreateEmployee();
  if (!me || me.role !== "owner") redirect("/leads");

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const webhookUrl = `${baseUrl}/api/webhooks/instagram`;
  const verifyToken = process.env.META_VERIFY_TOKEN || "(not set yet — set META_VERIFY_TOKEN in your env)";

  const hasAppSecret = Boolean(process.env.META_APP_SECRET);
  const hasPageToken = Boolean(
    process.env.META_PAGE_ACCESS_TOKEN ||
      process.env.INSTAGRAM_PAGE_ACCESS_TOKEN ||
      process.env.META_INSTAGRAM_USER_ACCESS_TOKEN,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Instagram integration
        </h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Connect your Instagram Business account so DMs auto-create leads here.
          One-time setup, ~30 minutes. You don&apos;t need Meta Business
          Verification or App Review for this — Dev Mode is fine for a single business.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook configuration</CardTitle>
          <CardDescription>
            Paste these into the Meta App webhook config UI when you reach Step 5
            of the setup below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyField label="Callback URL" value={webhookUrl} />
          <CopyField label="Verify Token" value={verifyToken} />
          <p className="text-xs text-(--color-muted-foreground)">
            App Secret status:{" "}
            {hasAppSecret ? (
              <span className="text-(--color-success)">
                set (signature verification enforced)
              </span>
            ) : (
              <span className="text-(--color-warning)">
                not set yet — webhook accepts unsigned traffic in development.
                Set META_APP_SECRET before going to production.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instagram @handles in the dashboard</CardTitle>
          <CardDescription>
            Webhook payloads rarely include <code>sender.username</code>. Without a
            follow-up lookup, leads show only an internal Instagram ID until someone
            types the handle by hand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            If leads show like <span className="font-mono">Instagram 2727…9523</span>, the
            webhook is working — we&apos;re missing a profile lookup. Meta exposes two
            setups; tokens are&nbsp;<b>different</b>.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              <b>Instagram API product</b> (Welcome → Generate access tokens): put that
              token in{" "}
              <code className="rounded bg-(--color-muted) px-1 py-0.5 font-mono text-[11px]">
                META_INSTAGRAM_USER_ACCESS_TOKEN
              </code>{" "}
              — we hit{" "}
              <code className="font-mono text-[11px]">graph.instagram.com</code> first (
              <a
                href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile"
                target="_blank"
                rel="noreferrer"
                className="text-(--color-primary) hover:underline"
              >
                Instagram Login User Profile API
              </a>
              ). Permissions:{" "}
              <code className="font-mono text-[11px]">
                instagram_business_basic, instagram_business_manage_messages
              </code>
              .
            </li>
            <li>
              <b>Classic Page workflow</b>: long-lived Page token in{" "}
              <code className="rounded bg-(--color-muted) px-1 py-0.5 font-mono text-[11px]">
                META_PAGE_ACCESS_TOKEN
              </code>{" "}
              →{" "}
              <code className="font-mono text-[11px]">graph.facebook.com</code> (
              <a
                href="https://developers.facebook.com/docs/messenger-platform/instagram/features/user-profile/"
                target="_blank"
                rel="noreferrer"
                className="text-(--color-primary) hover:underline"
              >
                Messenger Platform User Profile
              </a>
              ).
            </li>
          </ol>
          <p className="text-xs text-(--color-muted-foreground)">
            If your Step‑2 token is only in{" "}
            <code className="font-mono">META_PAGE_ACCESS_TOKEN</code>, we still probe{" "}
            <code className="font-mono">graph.instagram.com</code> before Facebook — usually
            no change needed. If lookups still fail, add{" "}
            <code className="font-mono">META_INSTAGRAM_GRAPH_API_VERSION=v25.0</code> in
            Vercel and redeploy.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshInstagramHandlesButton />
            <span className="text-xs text-(--color-muted-foreground)">
              Backfills @handles on rows that only have IDs (max 40/run). Check{" "}
              <b>Vercel → Logs</b> filter <code className="font-mono text-[11px]">ig-profile</code>{" "}
              for Meta error codes after a redeploy + refresh.
            </span>
          </div>
          <p className="text-xs text-(--color-muted-foreground)">
            Env status:{" "}
            {hasPageToken ? (
              <span className="font-medium text-(--color-foreground)">
                A token env var is set ({" "}
                <code className="font-mono text-[11px]">META_INSTAGRAM_USER_ACCESS_TOKEN</code>{" "}
                / <code className="font-mono text-[11px]">META_PAGE_ACCESS_TOKEN</code>). If handles
                are still numeric, inspect logs above or add the IG-specific env name.
              </span>
            ) : (
              <span className="font-medium text-(--color-warning)">
                not set — leads will stay as truncated Instagram IDs until you add tokens.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Go to{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-(--color-primary) hover:underline"
              >
                developers.facebook.com/apps
                <ExternalLink className="size-3" />
              </a>{" "}
              and click <b>Create App</b>. Choose type <b>Business</b>. Name it
              anything (e.g. &ldquo;Lush Wedding Hall&rdquo;). Free, instant.
            </Step>
            <Step n={2}>
              In the app dashboard, add the <b>Instagram</b>, <b>Webhooks</b>, and{" "}
              <b>Facebook Login for Business</b> products.
            </Step>
            <Step n={3}>
              Make sure your Instagram account is a <b>Business profile</b> (not
              Personal) and is linked to a Facebook Page (Instagram app &rarr;
              Settings &rarr; Account type and tools &rarr; Switch to professional account).
              Then in the Meta App &rarr; Instagram &rarr; <b>API Setup</b>, select your
              IG account.
            </Step>
            <Step n={4}>
              On <b>Instagram → Welcome to the Instagram API → Step 2: Generate access
              tokens</b>, create the Instagram access token for your IG account.
              Prefer adding it as <code>META_INSTAGRAM_USER_ACCESS_TOKEN</code> on
              Vercel (Instagram Login flow); or keep using{" "}
              <code>META_PAGE_ACCESS_TOKEN</code> — we probe both hosts. Copy your{" "}
              <b>App Secret</b> into <code>META_APP_SECRET</code>.
            </Step>
            <Step n={5}>
              Open <b>Webhooks</b> in the app. Pick the <b>Instagram</b> object.
              Paste the Callback URL and Verify Token shown above. Subscribe to
              the <code>messages</code> field. Meta will hit our verify endpoint
              and you should see a green check.
            </Step>
            <Step n={6}>
              Add yourself (and any agents) as <b>Developers</b> or <b>Testers</b>{" "}
              under App Roles. In Dev Mode, the webhook will receive messages from
              your IG Business account&apos;s inbox.
            </Step>
            <Step n={7}>
              In the Instagram app on your phone: Profile &rarr; Settings and
              Privacy &rarr; Business Tools and Controls &rarr;{" "}
              <b>Frequently Asked Questions</b>. Add the 3 Q/A pairs. Use the
              copy-paste text shown on the{" "}
              <Link href="/settings/venue" className="text-(--color-primary) hover:underline">
                Venue
              </Link>{" "}
              page.
            </Step>
            <Step n={8}>
              Test by DMing your own IG account from a different account that&apos;s
              also a tester/developer. The message should appear here within a
              second.
            </Step>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-xs font-bold text-(--color-primary-foreground)">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
