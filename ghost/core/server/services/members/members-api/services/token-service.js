const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// A token's `scope` declares its purpose. Only identity tokens may act as a
// member; entitlement tokens are read-only and handed to integrations.
const IDENTITY_TOKEN_SCOPE = 'members:identity';
const ENTITLEMENT_TOKEN_SCOPE = 'members:entitlements:read';

module.exports = class TokenService {
  /**
   * @param {object} deps
   * @param {import('../../../signing-keys').SigningKeyProvider} deps.signingKeys
   * @param {string} deps.issuer
   */
  constructor({ signingKeys, issuer }) {
    this._signingKeys = signingKeys;
    this._issuer = issuer;
  }

  async encodeIdentityToken({ sub }) {
    const { privateKey, kid } = await this._signingKeys.getSigningKey();
    return jwt.sign(
      {
        sub,
        kid,
        scope: IDENTITY_TOKEN_SCOPE,
      },
      privateKey,
      {
        keyid: kid,
        algorithm: 'RS512',
        audience: this._issuer,
        expiresIn: '10m',
        issuer: this._issuer,
      },
    );
  }

  async encodeEntitlementToken({ sub, memberUuid, paid, activeTierIds = [] }) {
    const { privateKey, kid } = await this._signingKeys.getSigningKey();

    return jwt.sign(
      {
        sub,
        kid,
        scope: ENTITLEMENT_TOKEN_SCOPE,
        member_uuid: memberUuid,
        paid,
        active_tier_ids: activeTierIds,
        jti: crypto.randomUUID(),
      },
      privateKey,
      {
        keyid: kid,
        algorithm: 'RS512',
        audience: this._issuer,
        expiresIn: '5m',
        issuer: this._issuer,
      },
    );
  }

  /**
   * Decode and verify a member *identity* token.
   *
   * Identity and entitlement tokens are signed with the same key and share the
   * same issuer/audience, so a signature check alone cannot tell them apart.
   * They are distinguished by `scope`: only tokens scoped `members:identity`
   * may act as the member. Read-only entitlement tokens
   * (`members:entitlements:read`) are handed to integrations and must never be
   * accepted on state-changing endpoints.
   *
   * @param {string} token
   * @returns {Promise<jwt.JwtPayload>}
   */
  async decodeToken(token) {
    const kid = jwt.decode(token, { complete: true })?.header?.kid;
    const result = jwt.verify(token, await this._signingKeys.getVerificationKey(kid), {
      algorithms: ['RS512'],
      issuer: this._issuer,
    });

    if (typeof result === 'string') {
      return { sub: result };
    }

    if (result.scope !== IDENTITY_TOKEN_SCOPE) {
      throw new jwt.JsonWebTokenError('Only identity tokens can act as a member');
    }

    return result;
  }

  async getPublicKeys() {
    return this._signingKeys.getJwks();
  }
};
