import crypto from 'node:crypto';
import { getPublicKeyInfo } from '../../core/server/lib/public-jwk';
import type { SigningKeyProvider } from '../../core/server/services/signing-keys/signing-key-service';

/** A SigningKeyProvider for fixed private keys; the first signs, all verify. */
export function staticSigningKeys(...privateKeys: string[]): SigningKeyProvider {
  const keys = () =>
    Promise.all(
      privateKeys.map(async (privateKey) => ({
        ...(await getPublicKeyInfo(privateKey)),
        publicKey: crypto
          .createPublicKey(privateKey)
          .export({ type: 'pkcs1', format: 'pem' })
          .toString(),
      })),
    );

  return {
    async getSigningKey() {
      return { privateKey: privateKeys[0], kid: (await getPublicKeyInfo(privateKeys[0])).kid };
    },
    async getVerificationKey(kid) {
      const all = await keys();
      return (all.find((key) => key.kid === kid) ?? all[0]).publicKey;
    },
    async getJwks() {
      return {
        keys: (await keys()).map(({ kid, jwk }) => ({
          e: jwk.e,
          kid,
          kty: jwk.kty,
          n: jwk.n,
          use: 'sig' as const,
        })),
      };
    },
  };
}
