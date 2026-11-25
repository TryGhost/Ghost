import ObjectId from 'bson-objectid';
import type { BetterAuthOptions } from 'better-auth/types';
import type { VirtualColumn } from './knex-adapter';

// `requirePKCE` is `require_pkce`
const snakeCase = (field: string) =>
  field.replace(
    /([a-z])([A-Z]+)/g,
    (_, last: string, upper: string) => `${last}_${upper.toLowerCase()}`,
  );

/** Maps each field to its snake_case column, as Ghost's tables name them. */
function snakeFields<const T extends string>(fields: readonly T[]): Record<T, string> {
  return Object.fromEntries(fields.map((field) => [field, snakeCase(field)])) as Record<T, string>;
}

/**
 * A core model's Better Auth field names. A spread or returned object skips
 * excess-property checks, so each field list is checked against this instead.
 */
type CoreField<Model extends 'user' | 'session' | 'account' | 'verification'> = keyof NonNullable<
  NonNullable<BetterAuthOptions[Model]>['fields']
>;

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
      ...snakeFields(['createdAt', 'updatedAt', 'emailVerified'] satisfies CoreField<'user'>[]),
      image: 'profile_image',
    },
  },
  session: {
    modelName: 'user_sessions',
    fields: snakeFields([
      'createdAt',
      'updatedAt',
      'userId',
      'expiresAt',
      'ipAddress',
      'userAgent',
    ] satisfies CoreField<'session'>[]),
  },
  account: {
    modelName: 'user_accounts',
    fields: snakeFields([
      'createdAt',
      'updatedAt',
      'userId',
      'accountId',
      'providerId',
      'accessToken',
      'refreshToken',
      'idToken',
      'accessTokenExpiresAt',
      'refreshTokenExpiresAt',
    ] satisfies CoreField<'account'>[]),
  },
  verification: {
    modelName: 'verifications',
    fields: snakeFields([
      'createdAt',
      'updatedAt',
      'expiresAt',
    ] satisfies CoreField<'verification'>[]),
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
  user: { fields: snakeFields(['twoFactorEnabled']) },
  twoFactor: {
    modelName: 'user_two_factors',
    fields: snakeFields(['userId', 'backupCodes', 'failedVerificationCount', 'lockedUntil']),
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
