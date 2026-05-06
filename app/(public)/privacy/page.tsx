export const metadata = { title: "Privacy Policy — Lush Wedding Hall" };

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm max-w-none space-y-4">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-(--color-muted-foreground)">
        Last updated: 6 May 2026
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Who we are</h2>
        <p>
          Lush Wedding Hall (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the
          internal lead-management dashboard available at{" "}
          <a href="https://lush-wedding-leads.vercel.app">
            lush-wedding-leads.vercel.app
          </a>
          . This policy describes how we collect, use, and protect information
          when prospective customers contact us through Instagram and when our
          team uses the dashboard to follow up.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Information we collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <b>Direct messages you send to our Instagram account</b>{" "}
            <code>@lushweddingsandoccasions</code>: the message text, your
            Instagram user ID, and your Instagram username (if public). We
            receive these via Meta&apos;s Graph API webhooks.
          </li>
          <li>
            <b>Contact details you choose to share</b>: typically a phone number
            or name when you ask for a callback.
          </li>
          <li>
            <b>Internal notes our team writes</b> about your enquiry to
            coordinate follow-up.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How we use it</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>To respond to your enquiry about wedding venue availability.</li>
          <li>
            To call you back at the number you provided, regarding your
            enquiry only.
          </li>
          <li>To keep an internal record of customer interactions.</li>
        </ul>
        <p>
          We do not sell, rent, or share your information with third parties for
          marketing purposes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Where it&apos;s stored</h2>
        <p>
          Data is stored in a Postgres database hosted on Neon (US East region)
          and the dashboard is hosted on Vercel. Authentication is provided by
          Clerk. We retain inquiry data for as long as we are actively in touch
          with you, and for up to 24 months after the last interaction for
          record-keeping.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your rights</h2>
        <p>
          You can ask us to delete your data at any time by emailing the address
          on our Instagram profile, or by visiting our{" "}
          <a href="/data-deletion">data deletion page</a>. We will action the
          request within 7 days.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Lush Wedding Hall · DMs to{" "}
          <a
            href="https://instagram.com/lushweddingsandoccasions"
            target="_blank"
            rel="noreferrer"
          >
            @lushweddingsandoccasions
          </a>
        </p>
      </section>
    </article>
  );
}
