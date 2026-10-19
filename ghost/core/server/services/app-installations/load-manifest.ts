import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import {
  parseManifest,
  parseManifestUrl,
  type AppManifest,
  type ParseManifestOptions,
} from '@tryghost/app-contracts/manifest';
import type { FetchFromApp } from './fetch-from-app';
import { createManifestFetcher } from './fetch-manifest';
import { StoredManifest } from './schema';

/** The rules a manifest is checked against: the site's URL and the environment. */
export type ManifestRules = Omit<ParseManifestOptions, 'manifestUrl'>;

/**
 * A manifest fetched server-side from its manifest URL and parsed, ready to preview,
 * compare or store.
 */
export interface LoadedManifest {
  /**
   * The manifest URL as parsed, before any redirect. This is what's stored and fetched
   * again later.
   */
  manifestUrl: string;
  /** Parsed, with relative URLs resolved against the final URL after redirects. */
  manifest: AppManifest;
  /** Exactly the text that is stored and digested. */
  serialised: string;
  /** Stored with the manifest, and sent back when a publisher confirms. */
  digest: string;
}

export type LoadManifest = (manifestUrl: string) => Promise<LoadedManifest>;

/**
 * The digest includes the manifest URL because two URLs can serve identical manifests
 * once every URL in them is absolute. Without it, reviewing one URL would also confirm the
 * other, and that other URL would then be used for every future re-check.
 *
 * Encoding writes keys in the schema's order, so the same manifest always serialises the
 * same way. The newline separator can't appear in either part: the URL parser strips
 * newlines, and the encoded JSON has none.
 */
function digestOf(manifestUrl: string, serialisedManifest: string): string {
  return createHash('sha256').update(`${manifestUrl}\n${serialisedManifest}`).digest('hex');
}

/**
 * Checks a manifest URL, fetches the manifest through `fetchFromApp`, and parses it against
 * the final URL. Redirects are only checked for staying on the same host (or upgrading
 * HTTP to HTTPS); the manifest rules apply to the final URL when it's parsed.
 *
 * Every problem is thrown as a Ghost error with an `APP_MANIFEST_*` code, which Admin
 * explains to the publisher. `getManifestRules` is called on every load because it reads
 * config.
 */
export function createManifestLoader({
  fetchFromApp,
  logging,
  getManifestRules,
}: {
  fetchFromApp: FetchFromApp;
  logging: Pick<GhostLogger, 'warn'>;
  getManifestRules: () => ManifestRules;
}): LoadManifest {
  const fetchManifest = createManifestFetcher({ fetchFromApp, logging });

  return async function loadManifest(input) {
    const rules = getManifestRules();
    const address = parseManifestUrl(input, rules.allowLocalhost);
    if (!address.success) {
      throw new errors.ValidationError({
        message: 'The app manifest URL is not valid.',
        code: 'APP_MANIFEST_URL_INVALID',
        context: address.error,
      });
    }
    const { manifestUrl } = address;

    const fetched = await fetchManifest(manifestUrl);
    const parsed = parseManifest(fetched.body, { ...rules, manifestUrl: fetched.url });
    if (!parsed.success) {
      throw new errors.ValidationError({
        message: 'The app manifest is not valid.',
        code: 'APP_MANIFEST_INVALID',
        context: parsed.errors
          .map(({ path, message }) => (path ? `${path}: ${message}` : message))
          .join('; '),
        // Each problem separately, so Admin can list them for the app's developer.
        errorDetails: parsed.errors,
      });
    }

    const serialised = z.encode(StoredManifest, parsed.manifest);
    return {
      manifestUrl,
      manifest: parsed.manifest,
      serialised,
      digest: digestOf(manifestUrl, serialised),
    };
  };
}
