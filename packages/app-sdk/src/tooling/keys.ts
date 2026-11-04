import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isGitIgnored } from './git.ts';

/**
 * Which keys to use. Development and production have separate identity keys, so an app
 * installed from the developer's machine is a different app from the deployed one.
 */
export type Mode = 'development' | 'production';

/** Where keys are kept, relative to the project: `.ghost-app/<mode>/<name>.json`. */
export const KEYS_DIRECTORY = '.ghost-app';

/**
 * - `identity`: signs the manifest. It says who made the app, so it stays with the developer
 *   (or their CI) and never reaches the backend or a bundle.
 * - `backend`: answers Ghost's challenge, so the backend holds it.
 */
export type KeyName = 'identity' | 'backend';

const KEY_NAMES: readonly KeyName[] = ['identity', 'backend'];

/** A private Ed25519 key as a JWK. */
export interface PrivateKeyJwk {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  d: string;
}

/** A public Ed25519 key as a JWK, as a manifest names it. */
export interface PublicKeyJwk {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
}

/** The production identity key, as CI provides it, instead of `.ghost-app/production/identity.json`. */
export const IDENTITY_KEY_VARIABLE = 'GHOST_APP_IDENTITY_KEY';

/**
 * The backend key, as the backend reads it, and as CI may provide it to sign a production
 * manifest instead of `.ghost-app/production/backend.json`. Signing only needs its public half.
 */
export const BACKEND_KEY_VARIABLE = 'GHOST_APP_BACKEND_KEY';

export interface KeyOptions {
  /** The project's directory, which holds `.ghost-app/`. */
  root: string;
  mode: Mode;
}

/** The file a key is kept in, relative to the project. */
export function keyFile(mode: Mode, name: KeyName): string {
  return join(KEYS_DIRECTORY, mode, `${name}.json`);
}

/** A new private Ed25519 key. */
export function generateKey(): PrivateKeyJwk {
  const { x, d } = generateKeyPairSync('ed25519').privateKey.export({ format: 'jwk' });
  return { kty: 'OKP', crv: 'Ed25519', x: x!, d: d! };
}

/** A key's public half, with only `kty`, `crv` and `x`. */
export function publicKeyOf(key: PrivateKeyJwk | PublicKeyJwk): PublicKeyJwk {
  return { kty: 'OKP', crv: 'Ed25519', x: key.x };
}

function isEd25519(value: unknown): value is { kty: 'OKP'; crv: 'Ed25519'; x: string } {
  const { kty, crv, x } = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  return kty === 'OKP' && crv === 'Ed25519' && typeof x === 'string';
}

/**
 * Reads a private key from JSON, checking its public half belongs to its private half.
 * `source` names where it came from, for the error; the key itself is never in one.
 */
export function readKey(text: string, source: string): PrivateKeyJwk {
  const key = readAnyKey(text, source);
  if (!('d' in key)) {
    throw new Error(`${source} is a public key; expected the private key, with d`);
  }
  return key;
}

/** Reads a key from JSON, private or public. */
function readAnyKey(text: string, source: string): PrivateKeyJwk | PublicKeyJwk {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${source} isn't a key: it isn't JSON`);
  }
  if (!isEd25519(value)) {
    throw new Error(`${source} isn't an Ed25519 key as a JWK, with kty "OKP", crv "Ed25519" and x`);
  }
  const { d } = value as { d?: unknown };
  if (typeof d !== 'string') {
    return publicKeyOf(value);
  }
  let x: string | undefined;
  try {
    const key = createPrivateKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: value.x, d },
      format: 'jwk',
    });
    ({ x } = createPublicKey(key).export({ format: 'jwk' }));
  } catch {
    throw new Error(`${source} isn't a usable Ed25519 key`);
  }
  if (x !== value.x) {
    throw new Error(`${source} isn't a usable Ed25519 key: its x doesn't match its d`);
  }
  return { kty: 'OKP', crv: 'Ed25519', x, d } satisfies PrivateKeyJwk;
}

async function readKeyFile(root: string, mode: Mode, name: KeyName): Promise<PrivateKeyJwk> {
  const file = keyFile(mode, name);
  let text: string;
  try {
    text = await readFile(join(root, file), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    throw new Error(
      mode === 'production'
        ? `There's no production ${name} key: ${file} doesn't exist. Create one with \`ghost-app keys --production\`${
            name === 'identity'
              ? `, or set ${IDENTITY_KEY_VARIABLE}`
              : `, or set ${BACKEND_KEY_VARIABLE}`
          }.`
        : `There's no development ${name} key: ${file} doesn't exist. Create one with \`ghost-app keys\`.`,
      { cause: error },
    );
  }
  return readKey(text, file);
}

export interface CreateKeysResult {
  /** The keys this call created. */
  created: KeyName[];
  /** The keys that already existed, which are never replaced. */
  kept: KeyName[];
}

/**
 * Creates a mode's identity and backend keys under `.ghost-app/<mode>/`, as files only the
 * owner can read. A key that exists is kept: replacing the identity key would make the app a
 * different app on every site that installed it.
 *
 * It refuses unless git ignores `.ghost-app/`, when the project is in a repository, so a
 * private key can't be committed by accident.
 */
export async function createKeys({ root, mode }: KeyOptions): Promise<CreateKeysResult> {
  const ignored = await isGitIgnored(
    root,
    KEY_NAMES.map((name) => keyFile(mode, name)),
  );
  if (!ignored.ignored) {
    throw new Error(
      `Refusing to write private keys where git could commit them: ${ignored.reason}. Add ${KEYS_DIRECTORY}/ to .gitignore.`,
    );
  }
  await mkdir(join(root, KEYS_DIRECTORY, mode), { recursive: true, mode: 0o700 });
  const result: CreateKeysResult = { created: [], kept: [] };
  for (const name of KEY_NAMES) {
    try {
      // `wx` fails if the file exists, so a key is never replaced, even by a concurrent run.
      await writeFile(
        join(root, keyFile(mode, name)),
        `${JSON.stringify(generateKey(), null, 2)}\n`,
        {
          flag: 'wx',
          mode: 0o600,
        },
      );
      result.created.push(name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      result.kept.push(name);
    }
  }
  return result;
}

export interface SigningKeys {
  identityKey: PrivateKeyJwk;
  /** The backend key's public half: all signing needs. */
  backendKey: PublicKeyJwk;
}

export interface ReadKeysOptions extends KeyOptions {
  /** Where to read `GHOST_APP_IDENTITY_KEY` and `GHOST_APP_BACKEND_KEY` from, in production. */
  env?: Record<string, string | undefined>;
}

/**
 * Where `readSigningKeys` reads a mode's key from: the variable, in production when it's set to
 * anything but blanks, or else the key's file.
 */
export function signingKeySource(
  mode: Mode,
  name: KeyName,
  env: Record<string, string | undefined> = process.env,
): string {
  const variable = name === 'identity' ? IDENTITY_KEY_VARIABLE : BACKEND_KEY_VARIABLE;
  return mode === 'production' && env[variable]?.trim() ? variable : keyFile(mode, name);
}

/**
 * The keys to sign a mode's manifest with. In production, `GHOST_APP_IDENTITY_KEY` and
 * `GHOST_APP_BACKEND_KEY` take the place of the files, so CI can sign without them; the
 * backend key may be its public half. A missing key is an error that says how to create it:
 * nothing here creates one.
 */
export async function readSigningKeys({
  root,
  mode,
  env = process.env,
}: ReadKeysOptions): Promise<SigningKeys> {
  const fromEnv = (name: KeyName, variable: string) =>
    signingKeySource(mode, name, env) === variable ? env[variable]!.trim() : undefined;
  const identityText = fromEnv('identity', IDENTITY_KEY_VARIABLE);
  const backendText = fromEnv('backend', BACKEND_KEY_VARIABLE);
  const identityKey = identityText
    ? readKey(identityText, IDENTITY_KEY_VARIABLE)
    : await readKeyFile(root, mode, 'identity');
  const backendKey = publicKeyOf(
    backendText
      ? readAnyKey(backendText, BACKEND_KEY_VARIABLE)
      : await readKeyFile(root, mode, 'backend'),
  );
  if (identityKey.x === backendKey.x) {
    throw new Error('The identity key and the backend key are the same key; they must be two keys');
  }
  return { identityKey, backendKey };
}

/** A mode's private backend key, from `.ghost-app/<mode>/backend.json`, for the backend to hold. */
export function readBackendKey({ root, mode }: KeyOptions): Promise<PrivateKeyJwk> {
  return readKeyFile(root, mode, 'backend');
}
