export const metadata = { title: "Terms of Service — Lush Wedding Hall" };

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-none space-y-4">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="text-sm text-(--color-muted-foreground)">
        Last updated: 6 May 2026
      </p>

      <p>
        This dashboard is operated by Lush Wedding Hall solely for internal lead
        management. There is no public-facing service or account creation: only
        authorized employees of Lush Wedding Hall may sign in.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Customer interaction</h2>
        <p>
          When you message our Instagram account{" "}
          <a
            href="https://instagram.com/lushweddingsandoccasions"
            target="_blank"
            rel="noreferrer"
          >
            @lushweddingsandoccasions
          </a>
          , your messages are received here so our team can follow up promptly.
          We do not respond automatically; a member of our team will personally
          contact you using the phone number you share.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Liability</h2>
        <p>
          The dashboard is provided &ldquo;as is&rdquo;. Bookings,
          availability, pricing, and contracts are confirmed by Lush Wedding
          Hall directly with the customer; nothing displayed in the dashboard
          constitutes a binding offer.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Changes</h2>
        <p>
          We may update these terms; the &quot;Last updated&quot; date will
          reflect the latest revision.
        </p>
      </section>
    </article>
  );
}
