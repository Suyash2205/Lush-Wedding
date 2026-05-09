import "server-only";

/** Profile fields returned for messaging participants — see Meta "User Profile" for Instagram Messaging. */
export type InstagramMessagingProfile = {
  username?: string;
  name?: string;
};

/**
 * Looks up Instagram username/display name using the instagram-scoped user id from webhooks.
 * Requires a Page access token tied to your linked Instagram Professional account:
 * META_PAGE_ACCESS_TOKEN (or legacy INSTAGRAM_PAGE_ACCESS_TOKEN).
 */
export async function fetchInstagramMessagingSenderProfile(
  instagramScopedUserId: string,
): Promise<InstagramMessagingProfile | null> {
  const token =
    process.env.META_PAGE_ACCESS_TOKEN ?? process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!token) return null;

  const version =
    process.env.META_GRAPH_API_VERSION?.trim().replace(/^v/, "v") ?? "v21.0";
  const v = version.startsWith("v") ? version : `v${version}`;
  const url = new URL(
    `https://graph.facebook.com/${v}/${encodeURIComponent(instagramScopedUserId)}`,
  );
  url.searchParams.set("fields", "name,username");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as InstagramMessagingProfile & {
      error?: { message: string };
    };

    if (!res.ok || data.error) {
      console.warn("[ig-profile] Graph lookup failed:", data.error?.message ?? res.status);
      return null;
    }

    const out: InstagramMessagingProfile = {};
    if (data.username?.trim()) out.username = data.username.trim();
    if (data.name?.trim()) out.name = data.name.trim();
    return Object.keys(out).length ? out : null;
  } catch (e) {
    console.warn("[ig-profile] fetch error:", e);
    return null;
  }
}
