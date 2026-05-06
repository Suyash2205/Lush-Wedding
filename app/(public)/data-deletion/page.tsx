export const metadata = { title: "Data Deletion — Lush Wedding Hall" };

export default function DataDeletionPage() {
  return (
    <article className="prose prose-sm max-w-none space-y-4">
      <h1 className="text-2xl font-semibold">Data deletion request</h1>
      <p>
        If you have previously contacted Lush Wedding Hall via Instagram and
        would like us to delete the records of your enquiry, please:
      </p>
      <ol className="list-decimal space-y-1 pl-6">
        <li>
          DM us at{" "}
          <a
            href="https://instagram.com/lushweddingsandoccasions"
            target="_blank"
            rel="noreferrer"
          >
            @lushweddingsandoccasions
          </a>{" "}
          with the words &ldquo;Please delete my data&rdquo;, OR
        </li>
        <li>
          Email us using the email address shown on our Instagram profile.
        </li>
      </ol>
      <p>
        We will permanently delete all stored messages, your Instagram user ID,
        any phone number you shared, and any internal notes within 7 working
        days, and confirm by replying to your message.
      </p>
      <p>
        Note: we may retain anonymised, aggregated counts of enquiries over
        time for statistical purposes that cannot be linked back to you.
      </p>
    </article>
  );
}
