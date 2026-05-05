import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the X-Hub-Signature-256 header that Meta sends on every webhook POST.
 * Returns true if the body's HMAC matches the header.
 *
 * Pass the raw body string (do NOT JSON.parse and stringify again — bytes must match).
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  if (!appSecret) return false;
  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  const computed = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  if (expected.length !== computed.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(computed, "hex"),
    );
  } catch {
    return false;
  }
}
