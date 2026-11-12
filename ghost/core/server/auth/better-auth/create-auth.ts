// Minimal skips Kysely, which only serves direct connections and migrations;
// Ghost brings its own Knex adapter and knex-migrator
import { betterAuth } from 'better-auth/minimal';
import { createAuthMiddleware, isAPIError } from 'better-auth/api';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { CLIENT_IP_HEADER } from './client-ip';
import { createKnexAdapter } from './knex-adapter';
import { rateLimitStorage, type Limiters } from './rate-limit';
import { ghostStaffLifecycle } from './plugins/staff-lifecycle';
import { ROUTES } from './routes';
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
    getAdminOrigin(): string;
    getSubdir(): string;
    isSSL(url: string): boolean;
  };
  password: {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
  };
  logger: Logger;
  /** Ghost's `spam` limiters, which also back the compatibility routes */
  limiters: Limiters;
  /** Emails a legacy password reset link; a locked user's sign-in sends one */
  sendPasswordResetEmail(email: string): Promise<void>;
};

/**
 * Refuses a database Better Auth can't run on (plan §3.2): SQLite, or one
 * that doesn't keep Better Auth's data. `auth:betterAuthDev` only applies where
 * boot creates the in-development tables, so it stands in for a table check
 * until they graduate to a migration.
 */
export function assertDatabaseSupported({
  client,
  usesBetterAuth,
}: {
  /** `config.get('database:client')`, where the loader normalizes `mysql` to `mysql2` */
  client: string;
  /** `usesBetterAuth()` */
  usesBetterAuth: boolean;
}): void {
  const help =
    'Set auth:engine to legacy, or use MySQL in development with createInDevelopmentTables and auth:betterAuthDev enabled.';

  if (client !== 'mysql2') {
    throw new errors.IncorrectUsageError({
      message: 'auth:engine better-auth requires MySQL; SQLite is not supported.',
      help,
    });
  }

  if (!usesBetterAuth) {
    throw new errors.IncorrectUsageError({
      message:
        'auth:engine better-auth requires auth:betterAuthDev and the in-development auth tables, which only exist in development and testing with createInDevelopmentTables enabled.',
      help,
    });
  }
}

const CLEARS_FAILED_SIGN_INS: string[] = [ROUTES.signInEmail, ROUTES.resetPassword];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const omitToken = (value: Record<string, unknown>) => {
  const rest = { ...value };
  delete rest.token;
  return rest;
};

/**
 * Removes session tokens from a native response body (plan §10): a top-level
 * `token` (`/sign-in/email`, `/change-password`), `session.token`
 * (`/get-session`) and each session's `token` (`/list-sessions`). The cookie
 * is the only place a session token leaves the server.
 */
export function stripSessionTokens(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map((item) => (isPlainObject(item) ? omitToken(item) : item));
  }
  if (!isPlainObject(body)) {
    return body;
  }

  const stripped = omitToken(body);
  if (isPlainObject(stripped.session)) {
    stripped.session = omitToken(stripped.session);
  }
  return stripped;
}

/** Builds the Better Auth instance with Ghost's options (plan §3.1). */
export function createAuth(deps: CreateAuthDeps) {
  const { urlUtils } = deps;
  // Origin only: Better Auth ignores basePath when baseURL has a path, so the
  // subdirectory goes in basePath, matching where Ghost mounts the request
  const adminOrigin = urlUtils.getAdminOrigin();
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
    // On by default in production only
    rateLimit: { enabled: true, customStorage: rateLimitStorage(deps.limiters) },
    disabledPaths: [
      ROUTES.signUpEmail,
      ROUTES.updateUser,
      ROUTES.changeEmail,
      ROUTES.deleteUser,
      ROUTES.signInSocial,
    ],
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        // Server-side `auth.api` calls have no request and keep their tokens
        if (!ctx.request) {
          return;
        }
        const returned = ctx.context.returned;

        // Clears this IP's failed sign-ins, as the compatibility routes do
        if (CLEARS_FAILED_SIGN_INS.includes(ctx.path) && !isAPIError(returned)) {
          const ip = ctx.request.headers.get(CLIENT_IP_HEADER) ?? undefined;
          // Awaited, so the next request sees the cleared count
          await deps.limiters
            .userLogin()
            .reset({ ip })
            .catch((err: unknown) => deps.logger.error(err));
        }

        if (Array.isArray(returned) || isPlainObject(returned)) {
          return ctx.json(stripSessionTokens(returned) as Record<string, unknown>);
        }
      }),
    },
    plugins: [ghostStaffLifecycle({ sendPasswordResetEmail: deps.sendPasswordResetEmail })],
    telemetry: { enabled: false },
    logger: {
      log: (level, message, ...args) => deps.logger[level](message, ...args),
    },
    advanced: {
      database: { generateId: generateGhostId },
      // Express's req.ip, set by setClientIPHeader; IPv6 counts per /64, as Ghost's limiters key it
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER], ipv6Subnet: 64 },
      // Pinned: Better Auth turns both checks off when NODE_ENV is test or TEST is set
      disableOriginCheck: false,
      disableCSRFCheck: false,
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
