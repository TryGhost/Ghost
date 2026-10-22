import { z } from 'zod';

// 32 bytes in base64url without padding. The last character carries the final 4 bits and
// 2 zero bits, so only 16 of the 64 characters can end it, which keeps the spelling of a key
// unique.
const ED25519_X = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

const EXPECTED = 'Expected a public Ed25519 key as a JWK with kty, crv and x';

/** A public Ed25519 key as a JWK (RFC 8037), with nothing but the members it needs. */
export type PublicKeyJwk = { kty: 'OKP'; crv: 'Ed25519'; x: string };

const PRIVATE = 'Expected a public key, but this includes its private part (d)';

/**
 * A key a manifest names. A manifest is public, so a key that includes its private part
 * is refused with a message of its own: it has to be replaced, not just removed. Other
 * members are refused by name, as key tools often add some, such as `kid` or `alg`.
 */
export const publicKeyField = z.strictObject(
  {
    kty: z.literal('OKP', EXPECTED),
    crv: z.literal('Ed25519', EXPECTED),
    x: z.string(EXPECTED).regex(ED25519_X, 'Expected 32 bytes in base64url, without padding'),
  },
  {
    error: (issue) => {
      if (issue.code !== 'unrecognized_keys') {
        return EXPECTED;
      }
      return issue.keys.includes('d')
        ? PRIVATE
        : `Expected only kty, crv and x; remove ${issue.keys.join(', ')}`;
    },
  },
);
