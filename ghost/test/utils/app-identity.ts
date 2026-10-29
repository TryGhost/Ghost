import {
  answerChallenge,
  signManifest,
  type SignedManifest,
} from '@tryghost/app-contracts/identity';
import type { PublicKeyJwk } from '@tryghost/app-contracts/manifest';
import { exportJWK, generateKeyPair, type CryptoKey } from 'jose';

export interface TestKey {
  privateKey: CryptoKey;
  publicJwk: PublicKeyJwk;
}

/** A fresh Ed25519 key pair, as an app's developer or backend would hold it. */
export async function generateTestKey(): Promise<TestKey> {
  const { privateKey, publicKey } = await generateKeyPair('Ed25519');
  const { kty, crv, x } = await exportJWK(publicKey);
  return { privateKey, publicJwk: { kty, crv, x } as PublicKeyJwk };
}

/** An app's two keys: the identity key it signs manifests with, and its backend key. */
export interface TestAppKeys {
  identity: TestKey;
  backend: TestKey;
}

export async function generateTestAppKeys(): Promise<TestAppKeys> {
  return { identity: await generateTestKey(), backend: await generateTestKey() };
}

/**
 * Signs a manifest with an identity key, as an app's tooling would, as of `issuedAt` or
 * now.
 */
export function signTestManifest(
  manifest: unknown,
  identity: TestKey,
  options: { issuedAt?: Date } = {},
): Promise<SignedManifest> {
  return signManifest(manifest, identity.privateKey, options);
}

/**
 * Answers a challenge as an app's backend would, for a request that arrived at `url`.
 * Throws on a challenge it would refuse, so a test notices one it didn't expect.
 */
export async function answerTestChallenge(
  body: string,
  backend: TestKey,
  url: string,
): Promise<string> {
  const result = await answerChallenge(body, { backendKey: backend.privateKey, requestUrl: url });
  if (!result.success) {
    throw new Error(`The test app refused a challenge: ${result.error}`);
  }
  return JSON.stringify(result.answer);
}

/**
 * Public keys for fixtures that are never signed or challenged, such as a manifest a test
 * builds by hand as if it had been loaded.
 */
export const FIXTURE_IDENTITY_KEY: PublicKeyJwk = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_s',
};

export const FIXTURE_BACKEND_KEY: PublicKeyJwk = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'H7aU67-okztSJD3-0znkVDiCU-izOI3I851CZX8XDyk',
};
