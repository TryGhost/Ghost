// Minimal skips Kysely, which only serves direct connections and migrations;
// Ghost brings its own Knex adapter and knex-migrator
import { betterAuth } from 'better-auth/minimal';
import { createAuthMiddleware, isAPIError } from 'better-auth/api';
import type { Knex } from 'knex';
import { CLIENT_IP_HEADER } from './client-ip';
import { createKnexAdapter } from './knex-adapter';
import { rateLimitStorage, type Limiters } from './rate-limit';
import { ghostSso } from './plugins/sso';
import { appOAuthDisabledPaths, appOAuthPlugins, ghostApps } from './plugins/apps';
import { deleteAppTokens } from './plugins/app-clients';
import {
  DEVICE_TRUST_COOKIE,
  ghostDeviceVerification,
  verifiesNewSession,
  type DeviceVerificationCode,
} from './plugins/device-verification';
import { ghostSessionGate } from './plugins/session-gate';
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
export const DEVICE_COOKIE_NAME = 'ghost-admin-device';

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
  /** `security:staffDeviceVerification`, read per session so config changes apply */
  isStaffDeviceVerificationEnabled(): boolean;
  /** The `require_email_mfa` setting */
  isEmailMfaRequired(): boolean;
  /** Emails a device verification code */
  sendDeviceVerificationCode(message: DeviceVerificationCode): Promise<void>;
  /** The legacy session's origin rule (Origin, else Referer, else the admin URL) */
  getRequestOrigin(headers: Headers): string | null;
  /**
   * Registers the OAuth provider and jwt plugins, which issue app tokens. Plugins are
   * fixed at boot, so this is the `apps` flag then.
   */
  apps: boolean;
};

type SessionPins = { userId?: string; verified?: boolean; origin?: string | null };

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
  const appPlugins = deps.apps ? appOAuthPlugins({ adminOrigin }) : [];
  const [, appProvider] = appPlugins;

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
      ...appOAuthDisabledPaths(appPlugins),
    ],
    hooks: {
      // A password change ends every other session, as PUT /users/password does
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === ROUTES.changePassword) {
          return { context: { body: { ...ctx.body, revokeOtherSessions: true } } };
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        // As revokeUserSessions does: so a rollback to legacy can't revive them, and the app
        // tokens go with the sessions
        const changed = ctx.path === ROUTES.changePassword && ctx.context.newSession;
        if (changed && !isAPIError(ctx.context.returned)) {
          await deps.db('sessions').where({ user_id: changed.user.id }).del();
          await deleteAppTokens(ctx.context, { userId: changed.user.id });
        }

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
    databaseHooks: {
      session: {
        create: {
          async before(session, ctx) {
            const data: { verified?: boolean; origin?: string } = {};
            // A rotation (`/change-password` revoking others) replaces the current session
            const replaced = ctx?.context.session?.session as SessionPins | undefined;
            const rotated = replaced?.userId === session.userId ? replaced : undefined;

            // Never downgrades: createVerifiedSession passes `verified` itself
            if (
              rotated?.verified ||
              !deps.isStaffDeviceVerificationEnabled() ||
              (ctx && (await verifiesNewSession(session, ctx, deps)))
            ) {
              data.verified = true;
            }
            // Pinned at creation; resolvePrincipal treats a session without one as anonymous
            if (!session.origin) {
              const origin =
                rotated?.origin ?? (ctx?.headers ? deps.getRequestOrigin(ctx.headers) : null);
              if (origin) {
                data.origin = origin;
              }
            }
            return { data };
          },
        },
      },
    },
    plugins: [
      // First, so every other plugin's hooks see the gated request
      ghostSessionGate(),
      ghostStaffLifecycle({ sendPasswordResetEmail: deps.sendPasswordResetEmail }),
      ghostSso(),
      ghostDeviceVerification({
        isEnabled: deps.isStaffDeviceVerificationEnabled,
        isEmailMfaRequired: deps.isEmailMfaRequired,
        emailLimiter: deps.limiters.verificationEmail,
        sendCode: deps.sendDeviceVerificationCode,
      }),
      ghostApps(appProvider?.options ?? null),
      ...appPlugins,
    ],
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
        // Signed and bound to the user; ghostDeviceVerification sets its lifetime
        [DEVICE_TRUST_COOKIE]: {
          name: DEVICE_COOKIE_NAME,
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
