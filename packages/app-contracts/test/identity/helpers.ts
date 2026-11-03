import { exportJWK, generateKeyPair, type CryptoKey } from 'jose';

import type { PublicKeyJwk } from '../../src/manifest/index.ts';

export interface KeyPair {
  privateKey: CryptoKey;
  publicJwk: PublicKeyJwk;
}

export async function newKeyPair(): Promise<KeyPair> {
  const { privateKey, publicKey } = await generateKeyPair('Ed25519');
  const { kty, crv, x } = await exportJWK(publicKey);
  return { privateKey, publicJwk: { kty, crv, x } as PublicKeyJwk };
}

export const encode = (value: unknown) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
