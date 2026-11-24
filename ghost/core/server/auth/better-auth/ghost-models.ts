import ObjectId from 'bson-objectid';
import type { BetterAuthOptions } from 'better-auth/types';
import type { VirtualColumn } from './knex-adapter';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' };

/** Ghost ids are ObjectIds. Pass as `advanced.database.generateId`. */
export const generateGhostId = () => new ObjectId().toHexString();

/**
 * Maps Better Auth's core models onto Ghost's tables: `user` onto the existing
 * `users` table, the rest onto Better Auth-shaped `user_*` tables.
 */
export const ghostModelOptions = {
  user: {
    modelName: 'users',
    fields: {
      ...timestamps,
      image: 'profile_image',
      emailVerified: 'email_verified',
    },
  },
  session: {
    modelName: 'user_sessions',
    fields: {
      ...timestamps,
      userId: 'user_id',
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
    },
  },
  account: {
    modelName: 'user_accounts',
    fields: {
      ...timestamps,
      userId: 'user_id',
      accountId: 'account_id',
      providerId: 'provider_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
    },
  },
  verification: {
    modelName: 'verifications',
    fields: {
      ...timestamps,
      expiresAt: 'expires_at',
    },
  },
} satisfies Pick<BetterAuthOptions, 'user' | 'session' | 'account' | 'verification'>;

/**
 * Better Auth user fields that `users` does not store (plan §4.3).
 * `email_verified` is always true and is not proof: the owner's address at
 * setup is never verified, so no enabled flow may trust it. Two-factor is on
 * when the user has a verified `user_two_factors` row.
 */
export const ghostVirtualColumns: Record<string, Record<string, VirtualColumn>> = {
  users: {
    email_verified: (db) => db.raw('1'),
    two_factor_enabled: (db, table) =>
      db.raw('exists (select 1 from ?? where ?? = ?? and ?? = 1)', [
        'user_two_factors',
        'user_two_factors.user_id',
        `${table}.id`,
        'user_two_factors.verified',
      ]),
  },
};

/**
 * Pass as `twoFactor({ schema: ghostTwoFactorSchema })`. `user.fields` only
 * renames Better Auth's core fields, so a plugin's fields are mapped here.
 * Do not enable `otpOptions`: OTP enrolment sets `twoFactorEnabled` without a
 * `user_two_factors` row, and the virtual column drops that write.
 */
export const ghostTwoFactorSchema = {
  user: { fields: { twoFactorEnabled: 'two_factor_enabled' } },
  twoFactor: {
    modelName: 'user_two_factors',
    fields: {
      userId: 'user_id',
      backupCodes: 'backup_codes',
      failedVerificationCount: 'failed_verification_count',
      lockedUntil: 'locked_until',
    },
  },
};

/**
 * `users` columns Better Auth never sets. Ghost disables Better Auth sign-up,
 * so this only applies to users it provisions (such as SSO). The slug is the
 * id until the user renames it, and `!` is never a valid bcrypt hash, so the
 * legacy password check rejects it; the credential lives in `user_accounts`.
 */
export const ghostCreateDefaults: Record<
  string,
  (row: Record<string, unknown>) => Record<string, unknown>
> = {
  users: (row) => ({ slug: row.id, password: '!' }),
};

// `requirePKCE` is `require_pkce`
const snakeCase = (field: string) =>
  field.replace(
    /([a-z])([A-Z]+)/g,
    (_, last: string, upper: string) => `${last}_${upper.toLowerCase()}`,
  );

/** Maps each field to its snake_case column, as Ghost's tables name them. */
function snakeFields(fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field, snakeCase(field)]));
}

/**
 * Pass as `oauthProvider({ schema: ghostOAuthProviderSchema })`. Maps the
 * provider's models onto Ghost's `oauth_*` tables.
 */
export const ghostOAuthProviderSchema = {
  oauthClient: {
    modelName: 'oauth_clients',
    fields: snakeFields([
      'clientId',
      'clientSecret',
      'clientDiscoveryId',
      'skipConsent',
      'enableEndSession',
      'subjectType',
      'clientCredentialsScopes',
      'userId',
      'createdAt',
      'updatedAt',
      'softwareId',
      'softwareVersion',
      'softwareStatement',
      'redirectUris',
      'postLogoutRedirectUris',
      'backchannelLogoutUri',
      'backchannelLogoutSessionRequired',
      'tokenEndpointAuthMethod',
      'applicationType',
      'jwksUri',
      'grantTypes',
      'responseTypes',
      'requirePKCE',
      'dpopBoundAccessTokens',
      'referenceId',
    ]),
  },
  oauthResource: {
    modelName: 'oauth_resources',
    fields: snakeFields([
      'accessTokenTtl',
      'refreshTokenTtl',
      'signingAlgorithm',
      'signingKeyId',
      'allowedScopes',
      'customClaims',
      'dpopBoundAccessTokensRequired',
      'createdAt',
      'updatedAt',
      'policyVersion',
    ]),
  },
  oauthClientResource: {
    modelName: 'oauth_client_resources',
    fields: snakeFields(['clientId', 'resourceId', 'createdAt']),
  },
  oauthRefreshToken: {
    modelName: 'oauth_refresh_tokens',
    fields: snakeFields([
      'clientId',
      'sessionId',
      'userId',
      'referenceId',
      'authorizationCodeId',
      'requestedUserInfoClaims',
      'expiresAt',
      'createdAt',
      'rotatedAt',
      'rotationReplayResponse',
      'rotationReplayExpiresAt',
      'authTime',
    ]),
  },
  oauthAccessToken: {
    modelName: 'oauth_access_tokens',
    fields: snakeFields([
      'clientId',
      'sessionId',
      'userId',
      'referenceId',
      'authorizationCodeId',
      'requestedUserInfoClaims',
      'refreshId',
      'expiresAt',
      'createdAt',
    ]),
  },
  oauthConsent: {
    modelName: 'oauth_consents',
    fields: snakeFields([
      'clientId',
      'userId',
      'referenceId',
      'requestedUserInfoClaims',
      'createdAt',
      'updatedAt',
    ]),
  },
  oauthClientAssertion: {
    modelName: 'oauth_client_assertions',
    fields: snakeFields(['expiresAt']),
  },
};

/** Pass as `jwt({ schema: ghostJwtSchema })`. */
export const ghostJwtSchema = {
  jwks: {
    modelName: 'oauth_jwks',
    fields: snakeFields(['publicKey', 'privateKey', 'createdAt', 'expiresAt']),
  },
};
