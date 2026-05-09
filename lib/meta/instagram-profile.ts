import "server-only";

/** Profile fields returned for messaging participants — see Meta "User Profile" for Instagram Messaging. */
export type InstagramMessagingProfile = {
  username?: string;
  name?: string;
};

/**
 * Looks up Instagram username/display name using the instagram-scoped user id (IGSID)
 * from webhooks. Requires a **Page** access token generated from someone who can
 * MODERATE the linked Facebook Page, with instagram_basic + instagram_manage_messages
 * (see Meta User Profile API).
 *
 * META_PAGE_ACCESS_TOKEN (or legacy INSTAGRAM_PAGE_ACCESS_TOKEN).
 */
export async function fetchInstagramMessagingSenderProfile(
  instagramScopedUserId: string,
): Promise<InstagramMessagingProfile | null> {
  const token =
    process.env.META_PAGE_ACCESS_TOKEN ?? process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!token) return null;

  const version =
    process.env.META_GRAPH_API_VERSION?.trim().replace(/^v/, "v") ?? "v22.0";
  const v = version.startsWith("v") ? version : `v${version}`;

  const fields = "name,username";
  const bases = [
    `https://graph.facebook.com/${v}`,
    `https://graph.instagram.com/${v}`,
  ] as const;

  let lastError = "";

  for (const base of bases) {
    const url = new URL(`${base}/${encodeURIComponent(instagramScopedUserId)}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", token);

    try {
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = (await res.json()) as InstagramMessagingProfile & {
        error?: {
          message?: string;
          code?: number;
          type?: string;
          fbtrace_id?: string;
        };
      };

      if (!res.ok || data.error) {
        const e = data.error;
        lastError = e
          ? `${e.message ?? "error"} (code ${e.code ?? "?"})${e.fbtrace_id ? ` trace ${e.fbtrace_id}` : ""}`
          : String(res.status);
        console.warn(`[ig-profile] ${base} failed for ${instagramScopedUserId.slice(0, 6)}…:`, lastError);
        continue;
      }

      const out: InstagramMessagingProfile = {};
      if (data.username?.trim()) out.username = data.username.trim();
      if (data.name?.trim()) out.name = data.name.trim();
      if (Object.keys(out).length) return out;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[ig-profile] ${base} fetch error:`, lastError);
    }
  }

  if (lastError) {
    console.warn(
      "[ig-profile] All lookups failed for IGSID; check META_PAGE_ACCESS_TOKEN is a Page token with instagram_basic + instagram_manage_messages. Last error:",
      lastError,
    );
  }

  return null;
}
