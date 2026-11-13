import { randomBytes } from 'node:crypto';
import { runWithTransaction } from '@better-auth/core/context';
import { APIError, BASE_ERROR_CODES, defineErrorCodes, getCurrentAdapter } from 'better-auth';
import type { AuthContext, BetterAuthPlugin, User } from 'better-auth';
import { createAuthEndpoint, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { ROUTES, SSO_PREFIX } from '../routes';

// Legacy user model statuses; `warn-*` users can still sign in
const WARN_STATUSES = ['warn-1', 'warn-2', 'warn-3', 'warn-4'];
const ACTIVE_STATUSES = ['active', ...WARN_STATUSES];

export const isActiveStatus = (status: unknown): boolean =>
  typeof status === 'string' && ACTIVE_STATUSES.includes(status);

/**
 * Only shown once the user is known: after a matching password, or on a path
 * that already proved who they are. An unknown email and a wrong password
 * both stay Better Auth's `INVALID_EMAIL_OR_PASSWORD`, so sign-in can't
 * enumerate staff (plan §5.3).
 */
export const STAFF_LIFECYCLE_ERROR_CODES = defineErrorCodes({
  PASSWORD_RESET_REQUIRED:
    'For security, you need to create a new password. An email has been sent to you with instructions!',
  ACCOUNT_SUSPENDED: 'Your account was suspended.',
});

const ERRORS = STAFF_LIFECYCLE_ERROR_CODES;

// Sign-in methods that prove control of the account without its password, so
// they unlock a locked user as a password reset does
const PASSWORDLESS_SIGN_IN: string[] = [ROUTES.magicLinkVerify, ROUTES.passkeyVerifyAuthentication];

const isPasswordlessSignIn = (path: string | undefined) =>
  !!path && (PASSWORDLESS_SIGN_IN.includes(path) || path.startsWith(SSO_PREFIX));

type StaffUser = User & { status?: string | null };

export type StaffLifecycleOptions = {
  /** Emails a password reset link, as the legacy session endpoint does for a locked user */
  sendPasswordResetEmail(email: string): Promise<void>;
};

const refusal = (status: unknown) =>
  status === 'locked'
    ? APIError.from('UNAUTHORIZED', ERRORS.PASSWORD_RESET_REQUIRED)
    : APIError.from('FORBIDDEN', ERRORS.ACCOUNT_SUSPENDED);

/** Ghost's staff status rules on top of Better Auth core (plan §3.3). */
export const ghostStaffLifecycle = (options: StaffLifecycleOptions) => {
  let authContext: AuthContext;

  // Matches the status read earlier, so a lock or suspension committed since stands
  const setStatus = async (userId: string, from: string[], to: string) => {
    const adapter = await getCurrentAdapter(authContext.adapter);
    await adapter.updateMany({
      model: 'user',
      where: [
        { field: 'id', value: userId },
        { field: 'status', operator: 'in', value: from },
      ],
      update: { status: to },
    });
  };

  return {
    id: 'ghost-staff-lifecycle',
    $ERROR_CODES: STAFF_LIFECYCLE_ERROR_CODES,

    init(ctx) {
      authContext = ctx;
      return {
        options: {
          databaseHooks: {
            session: {
              create: {
                // Every path that creates a session, including server-only ones
                async before(session, endpoint) {
                  const adapter = await getCurrentAdapter(authContext.adapter);
                  const user = await adapter.findOne<StaffUser>({
                    model: 'user',
                    where: [{ field: 'id', value: session.userId }],
                  });
                  if (!user) {
                    throw APIError.from('NOT_FOUND', BASE_ERROR_CODES.USER_NOT_FOUND);
                  }
                  if (isActiveStatus(user.status)) {
                    return;
                  }
                  if (user.status === 'locked' && isPasswordlessSignIn(endpoint?.path)) {
                    await setStatus(user.id, ['locked'], 'active');
                    return;
                  }
                  throw refusal(user.status);
                },
                // Waits for the commit, so a rolled-back session leaves no trace
                async after(session) {
                  if (!session) {
                    return;
                  }
                  const adapter = await getCurrentAdapter(authContext.adapter);
                  await adapter.update({
                    model: 'user',
                    where: [{ field: 'id', value: session.userId }],
                    update: { last_seen: new Date() },
                  });
                  await setStatus(session.userId, WARN_STATUSES, 'active');
                },
              },
            },
          },
        },
      };
    },

    hooks: {
      // After the endpoint, so its CSRF check and validation have run
      after: [
        {
          matcher: (ctx) => ctx.path === ROUTES.signInEmail,
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned;
            if (!isAPIError(returned)) {
              return;
            }
            const code = returned.body?.code;
            if (
              code !== ERRORS.PASSWORD_RESET_REQUIRED.code &&
              code !== BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code
            ) {
              return;
            }

            // A locked user's password was replaced, so as in legacy sign-in
            // any attempt emails a reset link. The response stays as it is, and
            // the email isn't awaited, so neither reveals the status
            const found = await ctx.context.internalAdapter.findUserByEmail(ctx.body.email);
            if (found && 'status' in found.user && found.user.status === 'locked') {
              options
                .sendPasswordResetEmail(found.user.email)
                .catch((err: unknown) =>
                  ctx.context.logger.error('Password reset email failed', err),
                );
            }
          }),
        },
      ],
    },

    endpoints: {
      /** A verified session with its cookie, for flows that already proved the user (plan §5.1) */
      createVerifiedSession: createAuthEndpoint.serverOnly(
        {
          method: 'POST',
          body: z.object({
            userId: z.string(),
            origin: z.string().optional(),
          }),
        },
        async (ctx) => {
          const { userId, origin } = ctx.body;
          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) {
            throw APIError.from('NOT_FOUND', BASE_ERROR_CODES.USER_NOT_FOUND);
          }
          // Hooks join the transaction; overrideAll keeps `verified` from its default
          const session = await runWithTransaction(ctx.context.adapter, () =>
            ctx.context.internalAdapter.createSession(
              userId,
              false,
              { verified: true, origin: origin ?? null },
              true,
            ),
          );
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ session, user });
        },
      ),

      revokeUserSessions: createAuthEndpoint.serverOnly(
        { method: 'POST', body: z.object({ userId: z.string() }) },
        async (ctx) => {
          await ctx.context.internalAdapter.deleteUserSessions(ctx.body.userId);
          return ctx.json({ status: true });
        },
      ),

      revokeAllSessions: createAuthEndpoint.serverOnly({ method: 'POST' }, async (ctx) => {
        const adapter = await getCurrentAdapter(ctx.context.adapter);
        const count = await adapter.deleteMany({ model: 'session', where: [] });
        return ctx.json({ count });
      }),

      /**
       * Locks every user and replaces every password, as the legacy
       * `lockAll` does. Suspended users stay `inactive`; locked users get the
       * reset email at their next sign-in attempt.
       */
      lockAllUsers: createAuthEndpoint.serverOnly({ method: 'POST' }, async (ctx) => {
        // Nobody knows this password, so no credential row matches a sign-in
        const hash = await ctx.context.password.hash(randomBytes(32).toString('hex'));
        const count = await runWithTransaction(ctx.context.adapter, async () => {
          const adapter = await getCurrentAdapter(ctx.context.adapter);
          await adapter.updateMany({
            model: 'user',
            where: [{ field: 'status', operator: 'ne', value: 'inactive' }],
            update: { status: 'locked' },
          });
          await adapter.updateMany({
            model: 'account',
            where: [{ field: 'providerId', value: 'credential' }],
            update: { password: hash },
          });
          return adapter.count({ model: 'user' });
        });
        return ctx.json({ count });
      }),
    },
  } satisfies BetterAuthPlugin;
};
