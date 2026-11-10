import { FlattenedSign, flattenedVerify, importJWK } from 'jose';
import { z } from 'zod';

import type { PublicKeyJwk } from '../manifest/keys.ts';
import { ALGORITHM, readExactHeader } from './jws.ts';
import { decodeText, type PrivateKey } from './keys.ts';

/** The `typ` a signed manifest's protected header carries, so no other signature passes as one. */
export const SIGNED_MANIFEST_TYPE = 'ghost-app-manifest';

/** A signed manifest as an app serves it: flattened JWS JSON (RFC 7515, section 7.2.2). */
export interface SignedManifest {
  protected: string;
  payload: string;
  signature: string;
}

const SignedManifestShape = z.strictObject({
  protected: z.string(),
  payload: z.string(),
  signature: z.string(),
});

const ProtectedHeader = z.strictObject({
  alg: z.literal(ALGORITHM),
  typ: z.literal(SIGNED_MANIFEST_TYPE),
});

const EXPECTED_HEADER = JSON.stringify({ alg: ALGORITHM, typ: SIGNED_MANIFEST_TYPE });

export type ReadSignedManifestResult =
  | {
      success: true;
      signed: SignedManifest;
      /** The manifest's exact text, as signed. Nothing in it is verified yet. */
      payload: string;
    }
  | { success: false; error: string };

export type VerifyResult = { success: true } | { success: false; error: string };

/**
 * Signs a manifest with an app's identity key. A string is signed as the exact text it is;
 * anything else is signed as its JSON.
 */
export async function signManifest(
  manifest: unknown,
  identityKey: PrivateKey,
): Promise<SignedManifest> {
  const text = typeof manifest === 'string' ? manifest : JSON.stringify(manifest);
  const signed = await new FlattenedSign(new TextEncoder().encode(text))
    .setProtectedHeader({ alg: ALGORITHM, typ: SIGNED_MANIFEST_TYPE })
    .sign(identityKey);
  return { protected: signed.protected!, payload: signed.payload, signature: signed.signature };
}

/**
 * Reads the manifest out of a signed manifest, without verifying it. The key to verify it
 * with is named inside the manifest, so the manifest has to be read and checked first;
 * nothing in it may be used until `verifySignedManifest` has passed.
 */
export function readSignedManifest(body: unknown): ReadSignedManifestResult {
  const shape = SignedManifestShape.safeParse(body);
  if (!shape.success) {
    return {
      success: false,
      error: 'Expected a signed manifest: flattened JWS JSON with protected, payload and signature',
    };
  }
  const signed = shape.data;

  if (!readExactHeader(signed.protected, ProtectedHeader)) {
    return { success: false, error: `Expected a protected header of ${EXPECTED_HEADER}` };
  }
  const payload = decodeText(signed.payload);
  if (payload === undefined) {
    return { success: false, error: 'Expected a payload of UTF-8 text in base64url' };
  }
  return { success: true, signed, payload };
}

/**
 * Checks a signed manifest was signed with the identity key the manifest names, under
 * exactly the protected header `readSignedManifest` accepts.
 */
export async function verifySignedManifest(
  signed: SignedManifest,
  identityKey: PublicKeyJwk,
): Promise<VerifyResult> {
  let key;
  try {
    key = await importJWK(identityKey, ALGORITHM);
  } catch {
    return { success: false, error: 'identity_key is not a usable Ed25519 key' };
  }
  if (!readExactHeader(signed.protected, ProtectedHeader)) {
    return { success: false, error: `Expected a protected header of ${EXPECTED_HEADER}` };
  }
  try {
    await flattenedVerify(signed, key, { algorithms: [ALGORITHM] });
  } catch {
    return { success: false, error: 'The signature was not made with identity_key' };
  }
  return { success: true };
}
