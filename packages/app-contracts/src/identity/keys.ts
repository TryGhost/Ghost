import { base64url, calculateJwkThumbprint, type FlattenedSign } from 'jose';
import { z } from 'zod';

import type { PublicKeyJwk } from '../manifest/types.ts';

/** A private Ed25519 key, in any form jose signs with: a CryptoKey, a KeyObject or a JWK. */
export type PrivateKey = Parameters<FlattenedSign['sign']>[0];

/**
 * A private Ed25519 key as a JWK, by its members alone: whether `x` and `d` are a key pair is
 * only known once the key is imported. Any other member is left out of what it reads.
 */
export const PrivateKeyJwkSchema = z.object({
  kty: z.literal('OKP'),
  crv: z.literal('Ed25519'),
  x: z.string(),
  d: z.string(),
});

/**
 * A key's RFC 7638 thumbprint: the same for a key however its JWK is written, so it is
 * what Ghost stores to recognise a key again.
 */
export function thumbprintOf(key: PublicKeyJwk): Promise<string> {
  return calculateJwkThumbprint({ kty: key.kty, crv: key.crv, x: key.x }, 'sha256');
}

/** UTF-8 text exactly as it was sent: invalid UTF-8 throws, and a byte order mark is kept. */
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
