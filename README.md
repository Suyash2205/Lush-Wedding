# Lush Wedding Lead Management

A Next.js 16 + Vercel Postgres dashboard for tracking wedding hall leads.
Instagram DMs auto-create leads via Meta webhooks; manual leads can be added by your team.
Each lead has a conversation transcript, internal comments, reminders, and stale-lead alerts.

The 3 simple FAQs (lawn capacity, catering, location) are answered natively by Instagram's
built-in FAQ feature — no AI bot, no monthly cost, no Meta App Review.
Anything else customers type lands here, and your team calls them back.

## Features

- Auto-capture Instagram DMs via Meta webhook (`messages` field, signature-verified)
- Manual lead entry for phone callers and walk-ins
- Lead pipeline with statuses: `new` -> `awaiting_callback` -> `contacted` -> `won`/`lost`
- Internal comments / call notes per lead
- Reminders with overdue badges
- Stale-lead detection: red "Pending" badge + hourly Resend digest email
- Notification bell with live counts of stale + due-today reminders
- Owner / agent role separation, with the first signed-in user becoming the owner
- Venue settings page that generates the exact text to paste into Instagram FAQs
- Integration setup page with the Meta webhook URL & verify token to copy-paste
- Mobile-friendly UI

## Tech stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 + shadcn-style UI components (Radix primitives)
- Drizzle ORM + Vercel Postgres / Neon
- Clerk for authentication
- Resend for email (free tier: 3k emails/mo)
- Vercel Cron for hourly stale-lead checks

## Getting started — local development

You will need:

1. **Node.js** 20.19+ or 22.13+
2. **A Postgres database**. Easiest path: a free Neon (https://neon.tech) project.
   You can also use Vercel Postgres after `vercel link`.
3. **A Clerk application** at https://dashboard.clerk.com — create one, copy the
   publishable + secret keys.
4. *(Optional for local)* A **Resend** account at https://resend.com if you want
   to test stale-lead digest emails.

### Step 1 — environment

```bash
cp .env.example .env.local
```

Fill in at minimum:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `META_VERIFY_TOKEN` — choose any random string (you'll paste this same string
  into Meta's webhook config later)

You can leave `META_APP_SECRET`, `RESEND_API_KEY`, and `INSTAGRAM_PAGE_ID` blank
for now; the app degrades gracefully.

### Step 2 — install + migrate + seed

```bash
npm install
npm run db:push        # create tables in your Postgres
npm run db:seed        # seed default venue info + app settings
npm run dev
```

Visit http://localhost:3000. You'll be redirected to sign in. The first user to
sign in becomes the **owner**. Subsequent sign-ups become agents (you can promote
them from `Settings -> Team`).

### Step 3 — try the manual flow first

Click **Add lead**, enter a phone caller's details, open the lead, leave an
internal note, set a reminder. This is fully usable end-to-end with no Meta setup.

## Connecting Instagram (~30 minutes, one-time)

You don't need Meta Business Verification or App Review for this. Dev Mode is
sufficient for a single business operating on its own IG account.

### Prerequisites

- An Instagram **Business** account (not Personal — switch in IG app -> Settings ->
  Account type and tools).
- That IG Business account must be linked to a **Facebook Page** (IG app forces
  this when you switch to Business).

### Steps

1. Go to https://developers.facebook.com/apps and click **Create App**.
   Choose type **Business**. Give it any name (e.g. "Lush Wedding Hall").

2. In the new app's dashboard, **add products**:
   - **Instagram**
   - **Webhooks**
   - **Facebook Login for Business**

3. Open **Instagram -> API Setup** in the left sidebar. Connect your IG Business
   account. Generate a **long-lived Page access token**.

4. Add a token for **@username** lookup (webhooks omit `sender.username`):
   - **Instagram API** (Welcome → Generate tokens): set **`META_INSTAGRAM_USER_ACCESS_TOKEN`**
     on Vercel — we call `graph.instagram.com` first ([Instagram Login User Profile](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile)).
   - **Or** a Facebook **Page** token: **`META_PAGE_ACCESS_TOKEN`** ([Messenger User Profile](https://developers.facebook.com/docs/messenger-platform/instagram/features/user-profile/)).
   If you only set `META_PAGE_ACCESS_TOKEN` with the Step‑2 Instagram token, we still
   try `graph.instagram.com` before `graph.facebook.com`. Redeploy after saving.

   If handles stay as `Instagram · 1234…5678`, try **`META_INSTAGRAM_GRAPH_API_VERSION=v25.0`**
   in Vercel, redeploy, then **Settings → Integration → Refresh handles**.

   After fixing the token, use **Refresh handles for existing leads** to backfill.

5. Copy your **App Secret** (App settings -> Basic -> App Secret). Set it as
   **`META_APP_SECRET`** in your deployment's environment variables.

6. In your dashboard at `/settings/integration`, copy the **Callback URL** and
   **Verify Token**. In Meta's app dashboard, go to **Webhooks**, pick the
   **Instagram** object, paste both values, and subscribe to the
   `messages` field. Meta will GET your URL — it should respond with the
   challenge and the subscription will turn green.

7. Add yourself (and any agents) as **Developers** or **Testers** under
   `App Roles -> Roles`. In Dev Mode the webhook will receive messages sent to
   your IG Business account.

8. On your phone, configure Instagram's built-in FAQs:
   IG -> Profile -> Settings and Privacy -> Business Tools and Controls ->
   **Frequently Asked Questions**. Add the 3 Q/A pairs. Use the copy-paste text
   shown on the **Venue** settings page in this dashboard.

9. **Test**: from a different IG account that's also a tester, send a DM to your
   business account. Within a second, a new lead should appear at `/leads`.

## Deploying to Vercel

The fastest path:

```bash
npm install -g vercel
vercel link        # connect to / create a Vercel project
vercel env pull    # if you've already configured env in the dashboard
```

Then in the Vercel dashboard for the project:

1. **Storage -> Create -> Postgres (Neon)**. Vercel will auto-set `DATABASE_URL`.
2. Add the rest of your env vars (Clerk, Resend, Meta, etc.) in
   **Settings -> Environment Variables**. Match the names in `.env.example`.
3. Deploy: `vercel --prod`
4. After the first successful deploy, run migrations against the production DB:
   ```bash
   DATABASE_URL=<your-prod-url> npm run db:push
   DATABASE_URL=<your-prod-url> npm run db:seed
   ```
5. Update `NEXT_PUBLIC_APP_URL` to your production URL and redeploy.
6. Update Meta's webhook Callback URL to point at your production domain.

The cron in `vercel.json` triggers `/api/cron/stale-leads` once per day at
03:30 UTC (~09:00 IST) on Hobby plans. Upgrade to Pro and change the schedule to
`0 * * * *` for hourly digests. The in-dashboard "Pending" red badge updates on
every page load regardless of the cron schedule. To secure the endpoint, set
`CRON_SECRET` in your Vercel env — Vercel automatically sends it as the
Authorization header for cron requests.

## Adding a second admin (or any teammate)

There is no separate "users" table — authentication is handled entirely by
Clerk, so anyone with their own email + password (or Google account) gets in.
The flow is:

1. Sign in to your dashboard as the existing owner.
2. Go to **Settings → Team**.
3. Copy the **invite link** at the top of that page (it points at `/sign-up`).
4. Send it to the second person. They sign up at that link with their own
   email + password.
5. Their first sign-in auto-creates a row in the `employees` table with the
   role `agent` (read leads, add notes, set reminders, change status).
6. Back on **Settings → Team**, click **Promote to owner** next to their name.
   They now have full access (Settings, Team, Integration, Venue).

There is no upper limit — you can have as many owners and agents as you need.
Clerk's free tier covers 10,000 monthly active users.

## Project structure

```
app/
  (dashboard)/                      # Auth-gated pages (Clerk middleware)
    layout.tsx                      # Top nav + bottom mobile nav
    leads/page.tsx                  # Lead list with stale badges + filters
    leads/[id]/page.tsx             # Lead detail: chat, comments, reminders, actions
    settings/venue/page.tsx         # Edit venue info, generate IG FAQ text
    settings/team/page.tsx          # Promote / demote employees
    settings/integration/page.tsx   # Meta App setup walkthrough
  api/
    webhooks/instagram/route.ts     # GET verify + POST handler (signature-verified)
    leads/route.ts                  # POST add manual lead
    leads/[id]/route.ts             # PATCH status / assignment / contact details
    leads/[id]/comments/route.ts    # POST internal note
    leads/[id]/reminders/route.ts   # POST + PATCH reminder
    employees/[id]/route.ts         # PATCH role (owner-only)
    settings/venue/route.ts         # PUT venue info + threshold
    notifications/route.ts          # GET counts for the bell
    cron/stale-leads/route.ts       # Vercel Cron entry, sends Resend digest
  sign-in, sign-up                  # Clerk pages

components/                          # UI components
  ui/                                # Button, Input, Dialog, Select, Card, Badge, etc.
  AddLeadDialog.tsx
  LeadFilters.tsx
  LeadActions.tsx                   # Status / assignment / contact-details panel
  StatusBadge.tsx
  ChatTranscript.tsx
  CommentList.tsx
  ReminderForm.tsx
  TeamTable.tsx
  VenueSettingsForm.tsx
  CopyField.tsx
  NotificationBell.tsx

lib/
  auth.ts                           # getOrCreateEmployee, requireOwner
  leads.ts                          # Server-side data access (listLeads, etc.)
  lead-constants.ts                 # STATUS_LABELS shared by client + server
  notifications.ts                  # Resend digest email
  utils.ts                          # cn(), formatPhone(), extractFirstPhone()
  meta/
    verify.ts                       # X-Hub-Signature-256 HMAC
    instagram.ts                    # Webhook payload parser

db/
  schema.ts                         # Drizzle schema
  index.ts                          # Lazy-initialized Drizzle client
  migrate.ts                        # Migration runner
  seed.ts                           # Default venue info + settings
  migrations/                       # Generated SQL

proxy.ts                             # Next.js 16 proxy (auth gate, was middleware.ts)
vercel.json                          # Cron config
drizzle.config.ts                    # Drizzle Kit config
```

## Useful npm scripts

| Command            | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Local dev server (http://localhost:3000)         |
| `npm run build`    | Production build                                 |
| `npm run start`    | Run production build                             |
| `npm run db:push`  | Apply schema directly to DB (dev convenience)    |
| `npm run db:generate` | Generate a new SQL migration                  |
| `npm run db:migrate`  | Apply generated migrations                    |
| `npm run db:seed`  | Seed default venue info + settings               |
| `npm run db:studio` | Drizzle Studio UI for the DB                    |

## What's intentionally not included (and why)

- **AI chatbot.** Instagram's built-in FAQs cover the 3 simple questions
  (capacity, catering, location). Anything else, customers type freely and your
  team calls them back. No AI cost, no LLM moderation surface area.
- **Outbound IG messaging.** Replying to customers from the dashboard would
  require Meta's `instagram_business_manage_messages` App Review (~1 week) and
  is unnecessary for the call-back workflow.
- **WhatsApp.** Adding it requires migrating your number to WhatsApp Cloud API,
  which deactivates the WA Business app on that number. The webhook handler
  pattern is identical to Instagram's — drop in `app/api/webhooks/whatsapp/route.ts`
  + `lib/meta/whatsapp.ts` when you decide to migrate.

## Cost expectation

All free tiers cover a single venue comfortably:

- Vercel hosting + cron: free
- Vercel Postgres / Neon: free up to 256 MB
- Clerk: free up to 10k MAU
- Resend: free up to 3k emails/mo
- Meta Graph API webhooks: free for Dev Mode against your own account
