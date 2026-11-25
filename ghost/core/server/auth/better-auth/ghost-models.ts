import type { oauthProvider } from '@better-auth/oauth-provider';
import ObjectId from 'bson-objectid';
import type { jwt, twoFactor } from 'better-auth/plugins';
import type { BetterAuthOptions } from 'better-auth/types';
import type { VirtualColumn } from './knex-adapter';

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' };

/**
 * A plugin's `schema` option accepts any of its models' fields on every model,
 * so mappings are checked against the schema the plugin declares instead.
 */
type SchemaMapping<Schema extends Record<string, { fields: object }>> = {
  [Model in keyof Schema]?: {
    modelName?: string;
    fields?: { [Field in keyof Schema[Model]['fields']]?: string };
  };
};

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
} satisfies SchemaMapping<ReturnType<typeof twoFactor>['schema']>;

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
    fields: {
      clientId: 'client_id',
      clientSecret: 'client_secret',
      clientDiscoveryId: 'client_discovery_id',
      skipConsent: 'skip_consent',
      enableEndSession: 'enable_end_session',
      subjectType: 'subject_type',
      clientCredentialsScopes: 'client_credentials_scopes',
      userId: 'user_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      softwareId: 'software_id',
      softwareVersion: 'software_version',
      softwareStatement: 'software_statement',
      redirectUris: 'redirect_uris',
      postLogoutRedirectUris: 'post_logout_redirect_uris',
      backchannelLogoutUri: 'backchannel_logout_uri',
      backchannelLogoutSessionRequired: 'backchannel_logout_session_required',
      tokenEndpointAuthMethod: 'token_endpoint_auth_method',
      applicationType: 'application_type',
      jwksUri: 'jwks_uri',
      grantTypes: 'grant_types',
      responseTypes: 'response_types',
      requirePKCE: 'require_pkce',
      dpopBoundAccessTokens: 'dpop_bound_access_tokens',
      referenceId: 'reference_id',
    },
  },
  oauthResource: {
    modelName: 'oauth_resources',
    fields: {
      accessTokenTtl: 'access_token_ttl',
      refreshTokenTtl: 'refresh_token_ttl',
      signingAlgorithm: 'signing_algorithm',
      signingKeyId: 'signing_key_id',
      allowedScopes: 'allowed_scopes',
      customClaims: 'custom_claims',
      dpopBoundAccessTokensRequired: 'dpop_bound_access_tokens_required',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      policyVersion: 'policy_version',
    },
  },
  oauthClientResource: {
    modelName: 'oauth_client_resources',
    fields: {
      clientId: 'client_id',
      resourceId: 'resource_id',
      createdAt: 'created_at',
    },
  },
  oauthRefreshToken: {
    modelName: 'oauth_refresh_tokens',
    fields: {
      clientId: 'client_id',
      sessionId: 'session_id',
      userId: 'user_id',
      referenceId: 'reference_id',
      authorizationCodeId: 'authorization_code_id',
      requestedUserInfoClaims: 'requested_user_info_claims',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      rotatedAt: 'rotated_at',
      rotationReplayResponse: 'rotation_replay_response',
      rotationReplayExpiresAt: 'rotation_replay_expires_at',
      authTime: 'auth_time',
    },
  },
  oauthAccessToken: {
    modelName: 'oauth_access_tokens',
    fields: {
      clientId: 'client_id',
      sessionId: 'session_id',
      userId: 'user_id',
      referenceId: 'reference_id',
      authorizationCodeId: 'authorization_code_id',
      requestedUserInfoClaims: 'requested_user_info_claims',
      refreshId: 'refresh_id',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
    },
  },
  oauthConsent: {
    modelName: 'oauth_consents',
    fields: {
      clientId: 'client_id',
      userId: 'user_id',
      referenceId: 'reference_id',
      requestedUserInfoClaims: 'requested_user_info_claims',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  oauthClientAssertion: {
    modelName: 'oauth_client_assertions',
    fields: {
      expiresAt: 'expires_at',
    },
  },
} satisfies SchemaMapping<ReturnType<typeof oauthProvider>['schema']>;

/** Pass as `jwt({ schema: ghostJwtSchema })`. */
export const ghostJwtSchema = {
  jwks: {
    modelName: 'oauth_jwks',
    fields: {
      publicKey: 'public_key',
      privateKey: 'private_key',
      createdAt: 'created_at',
      expiresAt: 'expires_at',
    },
  },
} satisfies SchemaMapping<ReturnType<typeof jwt>['schema']>;
