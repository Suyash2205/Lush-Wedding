import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-(--color-background)">
      <header className="border-b border-(--color-border) px-6 py-4">
        <Link href="/" className="font-semibold">
          Lush Wedding Hall
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <footer className="border-t border-(--color-border) px-6 py-6 text-center text-xs text-(--color-muted-foreground)">
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        {" \u00b7 "}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        {" \u00b7 "}
        <Link href="/data-deletion" className="hover:underline">
          Data deletion
        </Link>
      </footer>
    </div>
  );
}
