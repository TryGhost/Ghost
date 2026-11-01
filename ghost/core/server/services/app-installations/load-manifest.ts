import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { z } from 'zod';
import {
  readSignedManifest,
  thumbprintOf,
  verifySignedManifest,
} from '@tryghost/app-contracts/identity';
import {
  parseManifest,
  parseManifestUrl,
  type AppManifest,
  type ParseManifestOptions,
} from '@tryghost/app-contracts/manifest';
import type { FetchFromApp } from './fetch-from-app';
import {
  MANIFEST_MAX_BYTES,
  createManifestFetcher,
  manifestTooLarge,
  parseJson,
} from './fetch-manifest';
import { StoredManifest } from './schema';

/** The rules a manifest is checked against: the site's URL and the environment. */
export type ManifestRules = Omit<ParseManifestOptions, 'manifestUrl'>;

/**
 * A signed manifest fetched server-side from its manifest URL, its signature verified, and
 * parsed, ready for the identity check, then to preview, compare or store.
 */
export interface LoadedManifest {
  /**
   * The manifest URL as parsed, before any redirect, which the manifest names as its own.
   * This is what's stored and fetched again later.
   */
  manifestUrl: string;
  manifest: AppManifest;
  /** Exactly the text that is stored and digested. */
  serialised: string;
  /** Stored with the manifest, and sent back when a publisher confirms. */
  digest: string;
  /** The RFC 7638 thumbprint of the identity key the manifest is signed with. */
  identityKeyThumbprint: string;
  /**
   * When the manifest was signed, in seconds since the epoch, as its verified protected
   * header says. The identity check holds it to the newest the installation has seen.
   */
  issuedAt: number;
}

export type LoadManifest = (manifestUrl: string) => Promise<LoadedManifest>;

/**
 * Encoding writes keys in the schema's order, so the same manifest always serialises the
 * same way. The manifest names its own URL, so the digest covers that too.
 */
function digestOf(serialisedManifest: string): string {
  return createHash('sha256').update(serialisedManifest).digest('hex');
}

/**
 * Checks a manifest URL, fetches the signed manifest through `fetchFromApp`, parses the
 * manifest inside it, and verifies its signature with the identity key it names. The
 * manifest is checked before its signature, so its developer sees every problem with it,
 * but nothing in it is used unless the signature is valid. Redirects are only checked for
 * staying on the same host (or upgrading HTTP to HTTPS); the manifest must name the URL it
 * was asked for, wherever that redirects.
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

    const signed = readSignedManifest(await fetchManifest(manifestUrl));
    if (!signed.success) {
      throw new errors.ValidationError({
        message: 'The app’s manifest is not signed.',
        code: 'APP_MANIFEST_UNSIGNED',
        context: signed.error,
      });
    }
    const parsed = parseManifest(parseJson(signed.payload, manifestUrl), { ...rules, manifestUrl });
    if (!parsed.success) {
      const context = parsed.errors
        .map(({ path, message }) => (path ? `${path}: ${message}` : message))
        .join('; ');
      if (parsed.reason === 'manifest_url_mismatch') {
        throw new errors.ValidationError({
          message: 'The app’s manifest is for another address.',
          code: 'APP_MANIFEST_URL_MISMATCH',
          context,
        });
      }
      throw new errors.ValidationError({
        message: 'The app manifest is not valid.',
        code: 'APP_MANIFEST_INVALID',
        context,
        // Each problem separately, so Admin can list them for the app's developer.
        errorDetails: parsed.errors,
      });
    }
    const { manifest } = parsed;

    const verified = await verifySignedManifest(signed.signed, manifest.identity_key);
    if (!verified.success) {
      throw new errors.ValidationError({
        message: 'The app’s manifest signature is not valid.',
        code: 'APP_MANIFEST_SIGNATURE_INVALID',
        context: verified.error,
      });
    }

    // Measured on what's stored, which holds the paths resolved, so it can be longer than
    // what the app signed.
    const serialised = z.encode(StoredManifest, manifest);
    if (Buffer.byteLength(serialised) > MANIFEST_MAX_BYTES) {
      throw manifestTooLarge(manifestUrl);
    }
    return {
      manifestUrl,
      manifest,
      serialised,
      digest: digestOf(serialised),
      identityKeyThumbprint: await thumbprintOf(manifest.identity_key),
      issuedAt: signed.issuedAt,
    };
  };
}
