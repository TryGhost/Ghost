import { base64url, calculateJwkThumbprint, type FlattenedSign } from 'jose';

import type { PublicKeyJwk } from '../manifest/keys.ts';

/** A private Ed25519 key, in any form jose signs with: a CryptoKey, a KeyObject or a JWK. */
export type PrivateKey = Parameters<FlattenedSign['sign']>[0];

/**
 * A key's RFC 7638 thumbprint: the same for a key however its JWK is written, so it is
 * what Ghost stores to recognise a key again.
 */
export function thumbprintOf(key: PublicKeyJwk): Promise<string> {
  return calculateJwkThumbprint({ kty: key.kty, crv: key.crv, x: key.x }, 'sha256');
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

export function decodeText(encoded: string): string | undefined {
  try {
    return decodeUtf8(base64url.decode(encoded));
  } catch {
    return undefined;
  }
}

export function decodeJson(encoded: string): unknown {
  const text = decodeText(encoded);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
