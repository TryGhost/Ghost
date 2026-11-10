import { AppManifestSchema, type AppManifest } from '@tryghost/app-contracts/manifest';
import { z } from 'zod';

// The limits Ghost reads a manifest with, from App Installations in Ghost core, which doesn't
// export them to apps.

/** The largest manifest Ghost stores, which it keeps in a TEXT column. */
export const MANIFEST_MAX_BYTES = 64 * 1024;

/**
 * The largest signed manifest Ghost reads: the manifest in base64url is a third larger, and the
 * header and signature are well under a kilobyte.
 */
export const SIGNED_MANIFEST_MAX_BYTES = Math.ceil((MANIFEST_MAX_BYTES * 4) / 3) + 1024;

/**
 * A manifest's size as Ghost stores it: with its paths resolved, so it can be larger than what
 * was signed. Ghost refuses one larger than `MANIFEST_MAX_BYTES`.
 */
export function storedSize(manifest: AppManifest): number {
  return new TextEncoder().encode(JSON.stringify(z.encode(AppManifestSchema, manifest))).byteLength;
}

export const signedTooLargeMessage = () =>
  `Expected a signed manifest of at most ${Math.floor(SIGNED_MANIFEST_MAX_BYTES / 1024)} KB, as Ghost fetches it; text Ghost trims still counts`;

export const tooLargeMessage = () =>
  `Expected a manifest of at most ${MANIFEST_MAX_BYTES / 1024} KB once its paths are resolved, as Ghost stores it`;
