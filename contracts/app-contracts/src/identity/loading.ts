// How Ghost reads the signed manifest an app serves. Ghost core reads it by these, and the app
// SDK signs by them, so a manifest it signs is one Ghost reads.

/** The largest manifest Ghost stores, which it keeps in a TEXT column. */
export const MANIFEST_MAX_BYTES = 64 * 1024;

/**
 * The largest signed manifest Ghost reads: the manifest in base64url is a third larger, and
 * the header and signature are well under a kilobyte, so a manifest of the largest size
 * still fits.
 */
export const SIGNED_MANIFEST_MAX_BYTES = Math.ceil((MANIFEST_MAX_BYTES * 4) / 3) + 1024;

/** JSON text as Ghost reads it: a byte order mark is valid at its start, but JSON.parse refuses it. */
export function parseJsonText(text: string): unknown {
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}
