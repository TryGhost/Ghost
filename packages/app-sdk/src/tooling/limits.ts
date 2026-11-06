import { MANIFEST_MAX_BYTES, SIGNED_MANIFEST_MAX_BYTES } from '@tryghost/app-contracts/identity';
import { AppManifestSchema, type AppManifest } from '@tryghost/app-contracts/manifest';
import { z } from 'zod';

// The limits Ghost reads an app with, from the contracts Ghost core reads apps by. They're
// re-exported from here, so a test can lower one for everything that checks it.
export {
  ANSWER_MAX_BYTES,
  FETCH_TIMEOUT_MS,
  MANIFEST_MAX_BYTES,
  MAX_REDIRECTS,
  SIGNED_MANIFEST_MAX_BYTES,
} from '@tryghost/app-contracts/identity';

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
