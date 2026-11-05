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
