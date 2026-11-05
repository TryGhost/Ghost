import { betterAuth } from 'better-auth';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { createKnexAdapter } from './knex-adapter';
import {
  generateGhostId,
  ghostCreateDefaults,
  ghostModelOptions,
  ghostVirtualColumns,
} from './ghost-models';

export const BASE_PATH = '/ghost/api/admin/auth';
export const SESSION_COOKIE_NAME = 'ghost-admin-api-session';

type Logger = Record<'debug' | 'info' | 'warn' | 'error', (...args: unknown[]) => void>;

export type CreateAuthDeps = {
  db: Knex;
  /** The `admin_session_secret` setting */
  secret: string;
  /** `config.get('admin:sessionMaxAgeMs')` */
  sessionMaxAgeMs: number;
  urlUtils: {
    getAdminUrl(): string | undefined;
    getSiteUrl(): string;
    getSubdir(): string;
    isSSL(url: string): boolean;
  };
  password: {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
  };
  logger: Logger;
};

/**
 * Refuses a database Better Auth can't run on (plan §3.2): SQLite, or one
 * without the in-development tables. Boot creates those tables before this
 * runs whenever `createInDevelopmentTables` applies, so the flag stands in for
 * a table check until they graduate to a migration.
 */
export function assertDatabaseSupported({
  client,
  inDevelopmentTables,
}: {
  /** `config.get('database:client')`, where the loader normalizes `mysql` to `mysql2` */
  client: string;
  /** `shouldCreateInDevelopmentTables()` */
  inDevelopmentTables: boolean;
}): void {
  const help =
    'Set auth:engine to legacy, or use MySQL in development with createInDevelopmentTables enabled.';

  if (client !== 'mysql2') {
    throw new errors.IncorrectUsageError({
      message: 'auth:engine better-auth requires MySQL; SQLite is not supported.',
      help,
    });
  }

  if (!inDevelopmentTables) {
    throw new errors.IncorrectUsageError({
      message:
        'auth:engine better-auth requires the in-development auth tables, which only exist in development and testing with createInDevelopmentTables enabled.',
      help,
    });
  }
}

/** Builds the Better Auth instance with Ghost's options (plan §3.1). */
export function createAuth(deps: CreateAuthDeps) {
  const { urlUtils } = deps;
  // Origin only: Better Auth ignores basePath when baseURL has a path, so the
  // subdirectory goes in basePath, matching where Ghost mounts the request
  const adminOrigin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
  // The cookie lives on the admin origin, so its security follows the admin URL
  const ssl = urlUtils.isSSL(adminOrigin);

  return betterAuth({
    // Also Better Auth's only trusted origin, matching the legacy login-CSRF check
    baseURL: adminOrigin,
    basePath: `${urlUtils.getSubdir()}${BASE_PATH}`,
    // `secrets` stops Better Auth reading BETTER_AUTH_SECRETS from the environment,
    // and `secret` keeps its legacy fallback off BETTER_AUTH_SECRET and AUTH_SECRET
    secret: deps.secret,
    secrets: [{ version: 1, value: deps.secret }],
    database: createKnexAdapter({
      db: deps.db,
      virtualColumns: ghostVirtualColumns,
      createDefaults: ghostCreateDefaults,
    }),
    ...ghostModelOptions,
    user: {
      ...ghostModelOptions.user,
      // Never `password`: additional fields are returned on user objects
      additionalFields: {
        // Filled by column defaults and createDefaults, not by Better Auth
        status: { type: 'string', required: false, input: false },
        slug: { type: 'string', required: false, input: false },
        last_seen: { type: 'date', required: false, input: false },
      },
    },
    session: {
      ...ghostModelOptions.session,
      // Better Auth takes seconds
      expiresIn: deps.sessionMaxAgeMs / 1000,
      // Absolute expiry, as with the legacy session
      disableSessionRefresh: true,
      additionalFields: {
        verified: { type: 'boolean', defaultValue: false, input: false },
        origin: { type: 'string', required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      // emailVerified is virtual and always true, so it proves nothing (plan §4.3)
      requireEmailVerification: false,
      password: {
        hash: (password) => deps.password.hash(password),
        verify: ({ hash, password }) => deps.password.compare(password, hash),
      },
    },
    // express-brute wraps the native routes when they are mounted
    rateLimit: { enabled: false },
    disabledPaths: [
      '/sign-up/email',
      '/update-user',
      '/change-email',
      '/delete-user',
      '/sign-in/social',
    ],
    telemetry: { enabled: false },
    logger: {
      log: (level, message, ...args) => deps.logger[level](message, ...args),
    },
    advanced: {
      database: { generateId: generateGhostId },
      // Sets `Secure` and the `__Secure-` name prefix together, on an HTTPS admin URL only
      useSecureCookies: ssl,
      cookies: {
        session_token: {
          name: SESSION_COOKIE_NAME,
          attributes: {
            path: `${urlUtils.getSubdir()}/ghost`,
            sameSite: ssl ? 'none' : 'lax',
            httpOnly: true,
          },
        },
      },
    },
  });
}

export type GhostAuth = ReturnType<typeof createAuth>;
