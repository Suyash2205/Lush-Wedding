import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const clerkConfigured =
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const clerk = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export default function proxy(
  req: NextRequest,
  event: Parameters<typeof clerk>[1],
) {
  // Until Clerk is configured, surface a friendly setup notice on the home page
  // and let webhook / cron / health endpoints work freely. As soon as the env
  // vars are filled in, normal auth behaviour resumes.
  if (!clerkConfigured) {
    if (req.nextUrl.pathname === "/setup-required") return;
    if (
      req.nextUrl.pathname === "/" ||
      req.nextUrl.pathname.startsWith("/leads") ||
      req.nextUrl.pathname.startsWith("/settings") ||
      req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/setup-required";
      return NextResponse.rewrite(url);
    }
    return;
  }

  return clerk(req, event);
}

export const config = {
  // Exclude static assets, _next internals, and the public webhook/cron endpoints
  // from running through Clerk at all — those must work even when Clerk is unconfigured.
  matcher: [
    "/((?!_next|api/webhooks|api/cron|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
