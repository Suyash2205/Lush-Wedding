import "server-only";

/** Profile fields from Meta User Profile API (Instagram Messaging). */
export type InstagramMessagingProfile = {
  username?: string;
  name?: string;
};

function normalizeGraphVersion(raw: string | undefined, fallback: string): string {
  const v = (raw ?? fallback).trim();
  const withV = v.startsWith("v") ? v : `v${v}`;
  return withV;
}

type Attempt = {
  label: string;
  url: string;
};

function buildAttempts(igsid: string): Attempt[] {
  const igsidEnc = encodeURIComponent(igsid);
  /** Instagram Login product — graph.instagram.com + Instagram **user** access token from API Setup Step 2 */
  const instagramUserToken = process.env.META_INSTAGRAM_USER_ACCESS_TOKEN?.trim();
  /** Messenger / combined — Page token or fallback single token bucket */
  const pageOrSharedToken =
    process.env.META_PAGE_ACCESS_TOKEN?.trim() ??
    process.env.INSTAGRAM_PAGE_ACCESS_TOKEN?.trim() ??
    "";

  const instagramApiVersion = normalizeGraphVersion(
    process.env.META_INSTAGRAM_GRAPH_API_VERSION,
    "v21.0",
  );
  const facebookApiVersion = normalizeGraphVersion(
    process.env.META_GRAPH_API_VERSION,
    "v21.0",
  );

  const fields =
    process.env.META_IG_PROFILE_FIELDS?.trim() || "name,username";

  const attempts: Attempt[] = [];

  const pushInstagram = (token: string, label: string) => {
    const url = new URL(
      `https://graph.instagram.com/${instagramApiVersion}/${igsidEnc}`,
    );
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", token);
    attempts.push({ label: `${label} (graph.instagram.com ${instagramApiVersion})`, url: url.toString() });
  };

  const pushFacebook = (token: string, label: string) => {
    const url = new URL(
      `https://graph.facebook.com/${facebookApiVersion}/${igsidEnc}`,
    );
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", token);
    attempts.push({ label: `${label} (graph.facebook.com ${facebookApiVersion})`, url: url.toString() });
  };

  // Instagram Login path: MUST use graph.instagram.com with the token from Welcome → Generate access tokens.
  if (instagramUserToken) {
    pushInstagram(instagramUserToken, "META_INSTAGRAM_USER_ACCESS_TOKEN");
  }

  // Many teams paste that same Instagram user token into META_PAGE_ACCESS_TOKEN — try instagram.com BEFORE
  // facebook.com so we don't rely on Page tokens when they're actually on IG Login.
  if (pageOrSharedToken) {
    pushInstagram(pageOrSharedToken, "META_PAGE_ACCESS_TOKEN→instagram host");
    pushFacebook(pageOrSharedToken, "META_PAGE_ACCESS_TOKEN→facebook host");
  }

  // De-dupe identical URLs (same token in both env names)
  const seen = new Set<string>();
  return attempts.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

/**
 * Profile lookup for webhook `sender.id` (Instagram-scoped ID).
 *
 * - **Instagram API with Instagram Login:** `META_INSTAGRAM_USER_ACCESS_TOKEN` (recommended) OR put that same
 *   token in `META_PAGE_ACCESS_TOKEN` — we call **graph.instagram.com** first.
 * - **Classic Page token:** `META_PAGE_ACCESS_TOKEN` — **graph.facebook.com** runs after instagram host.
 *
 * Override API versions with `META_INSTAGRAM_GRAPH_API_VERSION` / `META_GRAPH_API_VERSION` (try `v21.0` or `v25.0`).
 */
export async function fetchInstagramMessagingSenderProfile(
  instagramScopedUserId: string,
): Promise<InstagramMessagingProfile | null> {
  const attempts = buildAttempts(instagramScopedUserId);
  if (attempts.length === 0) {
    console.warn("[ig-profile] No META_INSTAGRAM_USER_ACCESS_TOKEN / META_PAGE_ACCESS_TOKEN set.");
    return null;
  }

  let lastError = "";

  for (const { label, url } of attempts) {
    try {
      const res = await fetch(url, { cache: "no-store" });
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
          ? `${label}: ${e.message ?? "error"} (${e.code ?? "?"})${e.fbtrace_id ? ` [${e.fbtrace_id}]` : ""}`
          : `${label}: HTTP ${res.status}`;
        console.warn("[ig-profile]", lastError);
        continue;
      }

      const out: InstagramMessagingProfile = {};
      if (data.username?.trim()) out.username = data.username.trim();
      if (data.name?.trim()) out.name = data.name.trim();
      if (Object.keys(out).length) return out;
    } catch (e) {
      lastError =
        `${label}: ` + (e instanceof Error ? e.message : String(e));
      console.warn("[ig-profile]", lastError);
    }
  }

  if (lastError) {
    console.warn(
      "[ig-profile] All attempts failed — use token from Meta → Instagram product → Welcome → Step 2 (Generate tokens). Prefer env META_INSTAGRAM_USER_ACCESS_TOKEN. Last:",
      lastError,
    );
  }

  return null;
}
