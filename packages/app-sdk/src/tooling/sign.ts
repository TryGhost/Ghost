import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { signManifest } from '@tryghost/app-contracts/identity';
import { parseManifest, parseManifestUrl } from '@tryghost/app-contracts/manifest';

import {
  publicKeyOf,
  readSigningKeys,
  type PrivateKeyJwk,
  type PublicKeyJwk,
  type ReadKeysOptions,
} from './keys.ts';
import { UNKNOWN_GHOST_URL } from '../shared/manifest.ts';
import { parseJsonText } from '../shared/parse.ts';
import {
  MANIFEST_MAX_BYTES,
  SIGNED_MANIFEST_MAX_BYTES,
  signedTooLargeMessage,
  storedSize,
  tooLargeMessage,
} from './limits.ts';
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

type Refusal = Extract<SignResult, { success: false }>;

const refuse = (code: Refusal['code'], message: string, path = ''): Refusal => ({
  success: false,
  code,
  errors: [{ path, message }],
});

/**
 * Adds the manifest URL, both public keys and the development flag to a manifest, and signs it
 * with the identity key, unless Ghost would refuse it.
 */
export async function signAppManifest(source: unknown, options: SignOptions): Promise<SignResult> {
  // Ghost's own hosts are the one rule only a site knows, so a name no site has stands in.
  const address = parseManifestUrl(options.manifestUrl, {
    ghostUrls: [UNKNOWN_GHOST_URL],
    allowLocalhost: true,
  });
  if (!address.success) {
    return refuse('APP_MANIFEST_URL_INVALID', address.error);
  }
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return refuse('APP_MANIFEST_INVALID', 'Expected the manifest as a JSON object');
  }
  // The fields signing adds can't come from the file, or the file could name other keys.
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
  // Checked by the rules Ghost applies, so a manifest Ghost would refuse is never signed, and
  // the result lists every problem by the path to its field.
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
    return refuse('APP_MANIFEST_TOO_LARGE', tooLargeMessage());
  }

  const signed = await signManifest(JSON.stringify(manifest), options.identityKey);
  // Ghost limits the signed manifest it fetches too, and the payload keeps whatever the file had,
  // such as text Ghost trims, so a manifest Ghost stores can still be too large to fetch.
  if (new TextEncoder().encode(serialiseSigned(signed)).byteLength > SIGNED_MANIFEST_MAX_BYTES) {
    return refuse('APP_MANIFEST_TOO_LARGE', signedTooLargeMessage());
  }
  return { success: true, signed, manifest };
}

/** A signed manifest as the CLI and the Vite plugin write it to a file. */
export function serialiseSigned(signed: SignedManifest): string {
  return `${JSON.stringify(signed, null, 2)}\n`;
}

/** Reads `ghost-app.json`, or another readable manifest, as JSON. */
export async function readManifestSource(file: string): Promise<unknown> {
  const text = await readFile(file, 'utf8');
  try {
    return parseJsonText(text);
  } catch (error) {
    throw new Error(`${file} isn't JSON: ${(error as Error).message}`, { cause: error });
  }
}

export interface SignProjectOptions extends ReadKeysOptions {
  manifestUrl: string;
  /** The readable manifest, relative to `root`. `ghost-app.json` by default. */
  manifestFile?: string;
}

/** Signs a project's `ghost-app.json` for a manifest URL with the mode's keys. */
export async function signProject({
  root,
  mode,
  env,
  manifestUrl,
  manifestFile = MANIFEST_FILE,
}: SignProjectOptions): Promise<SignResult> {
  // Resolved, so an absolute path is taken as it is.
  const source = await readManifestSource(resolve(root, manifestFile));
  // Keys are read, never created: a missing one throws with how to create it.
  const keys = await readSigningKeys({ root, mode, env });
  return signAppManifest(source, { manifestUrl, ...keys, development: mode === 'development' });
}
