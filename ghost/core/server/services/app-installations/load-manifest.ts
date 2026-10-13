import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import type { Got } from 'got';
import { z } from 'zod';
import {
  parseManifest,
  parseManifestUrl,
  type AppManifest,
  type ParseManifestOptions,
} from '@tryghost/app-contracts/manifest';
import { createManifestFetcher } from './fetch-manifest';
import { StoredManifest } from './schema';

/** What the manifest is checked against: where Ghost is served from, and in which mode. */
export type ManifestRules = Omit<ParseManifestOptions, 'manifestUrl'>;

/**
 * A manifest Ghost has fetched from its manifest URL itself and parsed, ready to preview,
 * compare or keep.
 */
export interface LoadedManifest {
  /**
   * The address the install link pointed at, as the URL parser reads it and before any
   * redirect: what is stored, and fetched again later.
   */
  manifestUrl: string;
  /** Parsed, with its URLs resolved against where it was read from after any redirects. */
  manifest: AppManifest;
  /** Exactly the text that is stored. */
  serialised: string;
  /** Of the manifest alone, as stored with it. */
  digest: string;
  /** What a publisher reviews and confirms: the manifest and where it is read from. */
  reviewed: string;
}

export type LoadManifest = (manifestUrl: string) => Promise<LoadedManifest>;

/**
 * The manifest's digest, as stored with it. The same manifest always serialises the same
 * way, as encoding builds it in the schema's key order.
 */
function digestOf(serialisedManifest: string): string {
  return createHash('sha256').update(serialisedManifest).digest('hex');
}

/**
 * What a publisher reviews and confirms: the manifest and the address it is read from.
 * Two addresses can serve the same manifest, once every URL in it is absolute, so the
 * digest of the manifest alone would let a review of one address confirm the other.
 */
function reviewedDigestOf(manifestUrl: string, serialisedManifest: string): string {
  return createHash('sha256').update(`${manifestUrl}\n${serialisedManifest}`).digest('hex');
}

/**
 * Turns a manifest URL into a loaded manifest: checks the address before anything is
 * fetched from it, fetches the manifest through `request`, and parses it against where it
 * was finally read from.
 *
 * The check before fetching means the first request never goes to an address Ghost would
 * refuse. A redirect is judged only by whether it stays on the same host (or moves it from
 * HTTP to HTTPS); the manifest rules are applied to where it ends once the manifest has
 * been fetched, when parsing checks the address it was read from.
 *
 * Every problem is thrown as a Ghost error with an `APP_MANIFEST_*` code, which Admin
 * explains to the publisher.
 *
 * `getManifestRules` and `getLocalhostAlias` are asked on every load, as both come from
 * config.
 */
export function createManifestLoader({
  request,
  getManifestRules,
  getLocalhostAlias,
}: {
  request: Got;
  getManifestRules: () => ManifestRules;
  getLocalhostAlias: () => string | null;
}): LoadManifest {
  const fetchManifest = createManifestFetcher({ request, getLocalhostAlias });

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
        // The same problems one by one, so Admin can list them for the app's developer.
        errorDetails: parsed.errors,
      });
    }

    const serialised = z.encode(StoredManifest, parsed.manifest);
    return {
      manifestUrl,
      manifest: parsed.manifest,
      serialised,
      digest: digestOf(serialised),
      reviewed: reviewedDigestOf(manifestUrl, serialised),
    };
  };
}
