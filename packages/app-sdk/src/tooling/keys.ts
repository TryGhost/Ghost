import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, link, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { PrivateKeyJwkSchema, type PrivateKeyJwk } from '@tryghost/app-contracts/identity';
import type { PublicKeyJwk } from '@tryghost/app-contracts/manifest';

import { isGitIgnored } from './git.ts';
import { isErrnoException } from './errors.ts';

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

export const KEY_NAMES: readonly KeyName[] = ['identity', 'backend'];

export type { PrivateKeyJwk, PublicKeyJwk };

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

/**
 * Reads a private key from JSON. `source` names where it came from, for the error: the key
 * itself is never in one.
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
  const read = AnyKey.safeParse(value);
  if (!read.success) {
    // A key with a private part that doesn't read isn't a public key either.
    throw new Error(
      read.error.issues.every(({ path }) => path[0] === 'd')
        ? `${source} isn't a usable Ed25519 key: its d isn't a string`
        : `${source} isn't an Ed25519 key as a JWK, with kty "OKP", crv "Ed25519" and x`,
    );
  }
  const { x, d } = read.data;
  if (d === undefined) {
    return publicKeyOf(read.data);
  }
  // A JWK carries both halves, so a hand-edited or pasted one could pair a private half with
  // someone else's public half, and sign for a key the manifest doesn't name.
  if (publicHalfOf(d, source) !== x) {
    throw new Error(`${source} isn't a usable Ed25519 key: its x doesn't match its d`);
  }
  return { kty: 'OKP', crv: 'Ed25519', x, d } satisfies PrivateKeyJwk;
}

// A key whose private part may be missing, as a public key's is.
const AnyKey = PrivateKeyJwkSchema.partial({ d: true });

// What PKCS#8 puts before an Ed25519 private key's 32 bytes.
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

/**
 * The public half of a private half, as `x`. Derived from `d` alone, as Node 24.22 and later
 * refuse a JWK whose halves don't match while earlier versions take its `x` as given, so a
 * mismatch is reported the same way on any version.
 */
function publicHalfOf(d: string, source: string): string | undefined {
  const bytes = Buffer.from(d, 'base64url');
  if (bytes.length !== 32) {
    throw new Error(`${source} isn't a usable Ed25519 key`);
  }
  const key = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, bytes]),
    format: 'der',
    type: 'pkcs8',
  });
  return createPublicKey(key).export({ format: 'jwk' }).x;
}

async function readKeyFile(root: string, mode: Mode, name: KeyName): Promise<PrivateKeyJwk> {
  const file = keyFile(mode, name);
  let text: string;
  try {
    text = await readFile(join(root, file), 'utf8');
  } catch (error) {
    if (!isErrnoException(error) || error.code !== 'ENOENT') {
      throw error;
    }
    throw new Error(missingKeyMessage(mode, name, file), { cause: error });
  }
  return readKey(text, file);
}

/** Says how to create a missing key, as nothing that reads keys creates one. */
function missingKeyMessage(mode: Mode, name: KeyName, file: string): string {
  if (mode === 'development') {
    return `There's no development ${name} key: ${file} doesn't exist. Create one with \`ghost-app keys\`.`;
  }
  // In production, CI may provide the key as a variable instead.
  return `There's no production ${name} key: ${file} doesn't exist. Create one with \`ghost-app keys --production\`, or set ${variableFor(name)}.`;
}

const variableFor = (name: KeyName) =>
  name === 'identity' ? IDENTITY_KEY_VARIABLE : BACKEND_KEY_VARIABLE;

export interface CreateKeysResult {
  /** The keys this call created. */
  created: KeyName[];
  /** The keys that already existed, which are never replaced. */
  kept: KeyName[];
}

/**
 * Creates a mode's missing identity and backend keys under `.ghost-app/<mode>/`, as files only
 * their owner can read, and keeps any that exist.
 */
export async function createKeys({ root, mode }: KeyOptions): Promise<CreateKeysResult> {
  // Each key is written whole to a temporary file beside it first, then linked to its name.
  const keys = KEY_NAMES.map((name) => {
    const file = keyFile(mode, name);
    const pending = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`);
    return { name, file, pending };
  });
  // So a private key can't be committed by accident, git must ignore every file a key is
  // written to, the temporary ones included.
  await refuseUnlessGitIgnores(root, [
    ...keys.map(({ file }) => file),
    ...keys.map(({ pending }) => pending),
  ]);
  await mkdir(join(root, KEYS_DIRECTORY, mode), { recursive: true, mode: 0o700 });
  const result: CreateKeysResult = { created: [], kept: [] };
  for (const { name, file, pending } of keys) {
    // An existing key is kept: a new identity key would make the app a different app on every
    // site that installed it.
    const created = await publishKey(join(root, file), join(root, pending));
    result[created ? 'created' : 'kept'].push(name);
  }
  return result;
}

async function refuseUnlessGitIgnores(root: string, files: string[]) {
  const ignored = await isGitIgnored(root, files);
  if (!ignored.ignored) {
    throw new Error(
      `Refusing to write private keys where git could commit them: ${ignored.reason}. Add ${KEYS_DIRECTORY}/ to .gitignore.`,
    );
  }
}

/** Writes a new key to `file` unless one is there, by way of `pending`, and says whether it did. */
async function publishKey(file: string, pending: string): Promise<boolean> {
  try {
    await writeFile(pending, `${JSON.stringify(generateKey(), null, 2)}\n`, {
      flag: 'wx',
      // Only for its owner on macOS and Linux. Windows ignores the mode, and the key gets the
      // folder's inherited permissions, which the README tells developers to keep private.
      mode: 0o600,
    });
    // A link fails if the name is taken, so a key is never replaced, even by a concurrent run,
    // and an interrupted write never leaves part of a key where a key belongs.
    await link(pending, file);
    return true;
  } catch (error) {
    if (!isErrnoException(error) || error.code !== 'EEXIST') {
      throw error;
    }
    // Kept, but only for its owner, as a key written by hand or copied in may not be.
    if (process.platform !== 'win32' && ((await stat(file)).mode & 0o077) !== 0) {
      await chmod(file, 0o600);
    }
    return false;
  } finally {
    await rm(pending, { force: true });
  }
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
  const variable = variableFor(name);
  return mode === 'production' && env[variable]?.trim() ? variable : keyFile(mode, name);
}

/**
 * The keys to sign a mode's manifest with, from the key files, or in production from
 * `GHOST_APP_IDENTITY_KEY` and `GHOST_APP_BACKEND_KEY`, so CI can sign without the files.
 */
export async function readSigningKeys({
  root,
  mode,
  env = process.env,
}: ReadKeysOptions): Promise<SigningKeys> {
  const fromVariable = (name: KeyName) =>
    signingKeySource(mode, name, env) === variableFor(name)
      ? env[variableFor(name)]!.trim()
      : undefined;

  const identityText = fromVariable('identity');
  const identityKey = identityText
    ? await sameAsFile(root, mode, 'identity', readKey(identityText, IDENTITY_KEY_VARIABLE))
    : await readKeyFile(root, mode, 'identity');

  // CI may provide only the backend key's public half, as signing needs nothing more.
  const backendText = fromVariable('backend');
  const backendKey = publicKeyOf(
    backendText
      ? await sameAsFile(root, mode, 'backend', readAnyKey(backendText, BACKEND_KEY_VARIABLE))
      : await readKeyFile(root, mode, 'backend'),
  );

  if (identityKey.x === backendKey.x) {
    throw new Error('The identity key and the backend key are the same key; they must be two keys');
  }
  return { identityKey, backendKey };
}

/**
 * A key from a variable, after checking it's the same key as the file, where there's one. A
 * variable left set, such as a development key exported for every shell, would otherwise win over
 * the file unnoticed, and a manifest naming the wrong backend key retires the right one on every
 * site.
 */
async function sameAsFile<Key extends PublicKeyJwk>(
  root: string,
  mode: Mode,
  name: KeyName,
  key: Key,
): Promise<Key> {
  const file = keyFile(mode, name);
  if (existsSync(join(root, file)) && (await readKeyFile(root, mode, name)).x !== key.x) {
    const variable = variableFor(name);
    throw new Error(
      `${variable} and ${file} are different ${name} keys. Unset ${variable} to sign with the file, or remove ${file} to sign with the variable.`,
    );
  }
  return key;
}

/** A mode's private backend key, from `.ghost-app/<mode>/backend.json`, for the backend to hold. */
export function readBackendKey({ root, mode }: KeyOptions): Promise<PrivateKeyJwk> {
  return readKeyFile(root, mode, 'backend');
}
