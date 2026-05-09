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
      process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
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
            Paste the same <b>long-lived Page access token</b> from your Meta app&apos;s{" "}
            <b>Instagram → API Setup</b> page into{" "}
            <code className="rounded bg-(--color-muted) px-1 py-0.5 text-xs">
              META_PAGE_ACCESS_TOKEN
            </code>{" "}
            on Vercel (and redeploy). It must be a <b>Page</b> token (not a personal
            user token), generated for the Facebook Page that is linked to your
            Instagram professional account / DM inbox.
          </p>
          <div className="rounded-md border border-(--color-border) bg-(--color-muted)/40 p-3 text-xs leading-relaxed text-(--color-muted-foreground)">
            Meta requires these permissions on that token (
            <a
              href="https://developers.facebook.com/docs/messenger-platform/instagram/features/user-profile/"
              target="_blank"
              rel="noreferrer"
              className="text-(--color-primary) hover:underline"
            >
              User Profile API
            </a>
            ):{" "}
            <span className="font-mono text-[11px]">
              instagram_basic, instagram_manage_messages, pages_manage_metadata,
              pages_read_engagement, pages_show_list
            </span>
            . Generate the token while logged in as someone who has{" "}
            <b>Moderate</b> access on your Facebook Page.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshInstagramHandlesButton />
            <span className="text-xs text-(--color-muted-foreground)">
              Use after fixing the env var — backfills @handles on existing leads (
              max {40}/click).
            </span>
          </div>
          <p className="text-xs text-(--color-muted-foreground)">
            Env status:{" "}
            {hasPageToken ? (
              <span className="font-medium text-(--color-foreground)">
                META_PAGE_ACCESS_TOKEN is present. If lists still show
                &ldquo;Instagram 1234…5678&rdquo;, the token is missing permissions or isn&apos;t
                Page-scoped — check App Dashboard → <b>Use cases → Permissions</b>, then tap
                <b> Refresh handles</b> above.
              </span>
            ) : (
              <span className="font-medium text-(--color-warning)">
                not set — leads will show as &ldquo;Instagram 1234&hellip;5678&rdquo;
                until you add the token or fill the handle after a phone call.
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
              On the same API Setup page, generate a <b>long-lived Page access token</b>{" "}
              and add it as <code>META_PAGE_ACCESS_TOKEN</code> on Vercel (then
              redeploy). Our webhook uses this to fetch each DM sender&apos;s public{" "}
              <b>@username</b> via the Graph API, because webhook JSON usually omits
              it. Also copy your <b>App Secret</b> into{" "}
              <code>META_APP_SECRET</code>.
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
