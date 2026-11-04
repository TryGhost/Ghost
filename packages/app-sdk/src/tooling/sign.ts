import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { signManifest } from '@tryghost/app-contracts/identity';
import { parseManifest, parseManifestUrl } from '@tryghost/app-contracts/manifest';

import {
  publicKeyOf,
  readSigningKeys,
  type Mode,
  type PrivateKeyJwk,
  type PublicKeyJwk,
  type ReadKeysOptions,
} from './keys.ts';
import { UNKNOWN_GHOST_URL } from '../shared/manifest.ts';
import { MANIFEST_MAX_BYTES, storedSize, tooLargeMessage } from './limits.ts';
import type { ManifestError, SignedManifest } from './types.ts';

/** The readable manifest a project keeps, which the tooling signs. */
export const MANIFEST_FILE = 'ghost-app.json';

/** The fields the tooling adds, which `ghost-app.json` mustn't set. */
const ADDED_FIELDS = ['manifest_url', 'identity_key', 'backend_key', 'development'] as const;

export interface SignOptions {
  /** The address the signed manifest will be served from, which it names as its own. */
  manifestUrl: string;
  identityKey: PrivateKeyJwk;
  /** Only its public half goes in the manifest. */
  backendKey: PrivateKeyJwk | PublicKeyJwk;
  /** Whether this is a development build, as it must be when any URL is on localhost. */
  development: boolean;
}

export type SignResult =
  | {
      success: true;
      signed: SignedManifest;
      /** The manifest as signed, with the fields the tooling added. */
      manifest: Record<string, unknown>;
    }
  | {
      success: false;
      /**
       * As Ghost would refuse it: `APP_MANIFEST_INVALID`, `APP_MANIFEST_URL_INVALID`, or
       * `APP_MANIFEST_TOO_LARGE` for one larger than Ghost stores.
       */
      code: 'APP_MANIFEST_INVALID' | 'APP_MANIFEST_URL_INVALID' | 'APP_MANIFEST_TOO_LARGE';
      errors: ManifestError[];
    };

/**
 * Adds the manifest URL, both public keys and the development flag to a manifest, checks it
 * by the rules Ghost applies, and signs it with the identity key. A manifest Ghost would refuse
 * isn't signed: the result lists every problem, by the path to the field.
 *
 * Ghost also refuses a manifest that points at the site's own origin, which only Ghost knows,
 * and accepts one on localhost only when Ghost runs in development.
 */
export async function signAppManifest(source: unknown, options: SignOptions): Promise<SignResult> {
  const address = parseManifestUrl(options.manifestUrl, true);
  if (!address.success) {
    return {
      success: false,
      code: 'APP_MANIFEST_URL_INVALID',
      errors: [{ path: '', message: address.error }],
    };
  }
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return {
      success: false,
      code: 'APP_MANIFEST_INVALID',
      errors: [{ path: '', message: 'Expected the manifest as a JSON object' }],
    };
  }
  const added = ADDED_FIELDS.filter((field) => field in source);
  if (added.length > 0) {
    return {
      success: false,
      code: 'APP_MANIFEST_INVALID',
      errors: added.map((field) => ({
        path: field,
        message: `Leave ${field} out: it's added when the manifest is signed`,
      })),
    };
  }

  const manifest = {
    ...source,
    manifest_url: address.manifestUrl,
    identity_key: publicKeyOf(options.identityKey),
    backend_key: publicKeyOf(options.backendKey),
    development: options.development,
  };
  const parsed = parseManifest(manifest, {
    manifestUrl: address.manifestUrl,
    ghostUrls: [UNKNOWN_GHOST_URL],
    allowLocalhost: true,
  });
  if (!parsed.success) {
    // A mismatch can't happen, as the manifest URL was just set; any failure is invalid.
    return { success: false, code: 'APP_MANIFEST_INVALID', errors: parsed.errors };
  }
  if (storedSize(parsed.manifest) > MANIFEST_MAX_BYTES) {
    return {
      success: false,
      code: 'APP_MANIFEST_TOO_LARGE',
      errors: [{ path: '', message: tooLargeMessage() }],
    };
  }
  const signed = await signManifest(`${JSON.stringify(manifest, null, 2)}\n`, options.identityKey);
  return { success: true, signed, manifest };
}

/** Reads `ghost-app.json`, or another readable manifest, as JSON. */
export async function readManifestSource(file: string): Promise<unknown> {
  const text = await readFile(file, 'utf8');
  try {
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (error) {
    throw new Error(`${file} isn't JSON: ${(error as Error).message}`, { cause: error });
  }
}

export interface SignProjectOptions extends ReadKeysOptions {
  manifestUrl: string;
  /** The readable manifest, relative to `root`. `ghost-app.json` by default. */
  manifestFile?: string;
}

/**
 * Signs a project's `ghost-app.json` for a manifest URL with the mode's keys, as `ghost-app
 * sign` and the Vite plugin do. A development manifest says it is one. Keys are read, never
 * created; a missing one throws with how to create it.
 */
export async function signProject({
  root,
  mode,
  env,
  manifestUrl,
  manifestFile = MANIFEST_FILE,
}: SignProjectOptions): Promise<SignResult> {
  const source = await readManifestSource(join(root, manifestFile));
  const keys = await readSigningKeys({ root, mode, env });
  return signAppManifest(source, { manifestUrl, ...keys, development: isDevelopment(mode) });
}

const isDevelopment = (mode: Mode) => mode === 'development';
