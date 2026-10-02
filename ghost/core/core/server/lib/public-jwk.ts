import crypto from 'node:crypto';
import * as errors from '@tryghost/errors';

export interface PublicRsaJwk {
  kty: string;
  n: string;
  e: string;
}

export interface PublicKeyInfo {
  /** RFC 7638 thumbprint, the `kid` node-jose used to derive for the same key. */
  kid: string;
  jwk: PublicRsaJwk;
}

// Parsing a PEM and thumbprinting it costs real CPU, so results are shared
// across every consumer of the same key. Keyed by digest so the cache never
// holds another reference to private key material.
const cache = new Map<string, Promise<PublicKeyInfo>>();

async function parse(publicKey: crypto.KeyObject): Promise<PublicKeyInfo> {
  // jose 6 is ESM-only. tsc emits this as `require('jose')` under module: commonjs,
  // which resolves via Node's require(esm) - available on every Node in `engines`.
  const { calculateJwkThumbprint } = await import('jose');
  const { kty, n, e } = publicKey.export({ format: 'jwk' });

  if (kty !== 'RSA' || !n || !e) {
    throw new errors.IncorrectUsageError({
      message: 'Expected an RSA private key',
    });
  }

  const jwk: PublicRsaJwk = { kty, n, e };

  return { kid: await calculateJwkThumbprint(jwk, 'sha256'), jwk };
}

function cached(
  kind: 'private' | 'public',
  pem: string,
  toPublicKey: (pem: string) => crypto.KeyObject,
): Promise<PublicKeyInfo> {
  const digest = `${kind}:${crypto.createHash('sha256').update(pem).digest('hex')}`;

  let info = cache.get(digest);

  if (!info) {
    info = Promise.resolve()
      .then(() => parse(toPublicKey(pem)))
      .catch((err) => {
        // Don't pin a failure forever - a later caller should retry.
        cache.delete(digest);
        throw err;
      });
    cache.set(digest, info);
  }

  return info;
}

/**
 * Public JWK and `kid` for a PEM-encoded RSA private key. Never returns private
 * parameters.
 */
export function getPublicKeyInfo(privateKeyPem: string): Promise<PublicKeyInfo> {
  // Node handles both PKCS#1 and PKCS#8 PEMs, and exports public fields only.
  return cached('private', privateKeyPem, (pem) =>
    crypto.createPublicKey(crypto.createPrivateKey(pem)),
  );
}

/** Public JWK and `kid` for a PEM-encoded RSA public key (PKCS#1 or SPKI). */
export function getPublicKeyInfoFromPublicKey(publicKeyPem: string): Promise<PublicKeyInfo> {
  return cached('public', publicKeyPem, (pem) => {
    // createPublicKey would also derive from a private PEM; keep this path public-only
    if (pem.includes('PRIVATE KEY')) {
      throw new errors.IncorrectUsageError({ message: 'Expected an RSA public key' });
    }
    return crypto.createPublicKey(pem);
  });
}
