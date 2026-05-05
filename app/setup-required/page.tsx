export const dynamic = "force-static";

export default function SetupRequiredPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">One step left — set up Clerk</h1>
      <p className="text-(--color-muted-foreground)">
        This deployment is live, but Clerk authentication is not configured yet.
        Sign up at{" "}
        <a
          href="https://dashboard.clerk.com"
          className="text-(--color-primary) underline"
          target="_blank"
          rel="noreferrer"
        >
          dashboard.clerk.com
        </a>
        , create an application, and set these env vars in your Vercel project
        settings:
      </p>
      <pre className="rounded-md border border-(--color-border) bg-(--color-muted) p-4 text-left text-xs">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...`}
      </pre>
      <p className="text-sm text-(--color-muted-foreground)">
        After adding them, redeploy. The dashboard will be ready and the first
        person to sign in becomes the owner.
      </p>
    </main>
  );
}
