import { sign } from 'jsonwebtoken';
import type { SigningKeyProvider } from '../signing-keys/signing-key-service';

type SigningKeys = Pick<SigningKeyProvider, 'getSigningKey'>;

export class IdentityTokenService {
  private signingKeys: SigningKeys;
  private issuer: string;

  constructor(signingKeys: SigningKeys, issuer: string) {
    this.signingKeys = signingKeys;
    this.issuer = issuer;
  }

  async getTokenForUser(email: string, role?: string) {
    const claims: Record<string, string> = {
      sub: email,
    };

    if (typeof role === 'string') {
      claims.role = role;
    }

    const { privateKey, kid } = await this.signingKeys.getSigningKey();

    const token = sign(claims, privateKey, {
      issuer: this.issuer,
      expiresIn: '5m',
      algorithm: 'RS256',
      keyid: kid,
    });

    return token;
  }
}
