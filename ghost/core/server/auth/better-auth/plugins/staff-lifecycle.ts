import { runWithTransaction } from '@better-auth/core/context';
import { APIError, BASE_ERROR_CODES, defineErrorCodes, getCurrentAdapter } from 'better-auth';
import type { AuthContext, BetterAuthPlugin, User } from 'better-auth';
import { createAuthEndpoint, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { ROUTES, SSO_PREFIX } from '../routes';
import { deleteAppTokens } from './app-clients';
import { ACTIVE_STAFF_STATUSES, isActiveStaffStatus } from '../../../../shared/staff-status';

// A warned user who signs in is set back to active
const WARN_STATUSES = ACTIVE_STAFF_STATUSES.filter((status) => status !== 'active');

/**
 * A user row's `status`, which Better Auth's internal adapter returns but
 * doesn't type. Unknown or missing reads as not active.
 */
export const staffStatus = (user: unknown): unknown =>
  typeof user === 'object' && user !== null && 'status' in user ? user.status : undefined;

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

export type StaffUser = User & { status?: string | null };

type Adapter = Awaited<ReturnType<typeof getCurrentAdapter>>;

export type StaffLifecycleOptions = {
  /** Emails a password reset link, as the legacy session endpoint does for a locked user */
  sendPasswordResetEmail(email: string): Promise<void>;
};

const refusal = (status: unknown) =>
  status === 'locked'
    ? APIError.from('UNAUTHORIZED', ERRORS.PASSWORD_RESET_REQUIRED)
    : APIError.from('FORBIDDEN', ERRORS.ACCOUNT_SUSPENDED);

// Matches the status read earlier, so a lock or suspension committed since stands
const setStatus = (adapter: Adapter, userId: string, from: string[], to: string) =>
  adapter.updateMany({
    model: 'user',
    where: [
      { field: 'id', value: userId },
      { field: 'status', operator: 'in', value: from },
    ],
    update: { status: to },
  });

/**
 * Throws unless the user may sign in. A passwordless sign-in unlocks a
 * `locked` user; `inactive` is always refused.
 */
export async function admitStaffUser(
  adapter: Adapter,
  user: Pick<User, 'id'>,
  { passwordless }: { passwordless: boolean },
): Promise<void> {
  const status = staffStatus(user);
  if (isActiveStaffStatus(status)) {
    return;
  }
  if (status === 'locked' && passwordless) {
    // No match means the user was suspended since the read
    if (await setStatus(adapter, user.id, ['locked'], 'active')) {
      return;
    }
    throw refusal('inactive');
  }
  throw refusal(status);
}

/** Ghost's staff status rules on top of Better Auth core (plan §3.3). */
export const ghostStaffLifecycle = (options: StaffLifecycleOptions) => {
  let authContext: AuthContext;

  return {
    id: 'ghost-staff-lifecycle',
    $ERROR_CODES: STAFF_LIFECYCLE_ERROR_CODES,

    init(ctx) {
      authContext = ctx;
      return {
        options: {
          emailAndPassword: {
            // Required by the type; the instance's own options take precedence
            enabled: true,
            // As legacy doReset; a user suspended since keeps their status
            async onPasswordReset({ user }) {
              await setStatus(
                await getCurrentAdapter(authContext.adapter),
                user.id,
                ['locked'],
                'active',
              );
            },
          },
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
                  await admitStaffUser(adapter, user, {
                    passwordless: isPasswordlessSignIn(endpoint?.path),
                  });
                },
                // Bookkeeping only: the session exists by now, so a failure is logged, not thrown
                async after(session) {
                  if (!session) {
                    return;
                  }
                  try {
                    const adapter = await getCurrentAdapter(authContext.adapter);
                    await adapter.update({
                      model: 'user',
                      where: [{ field: 'id', value: session.userId }],
                      update: { last_seen: new Date() },
                    });
                    await setStatus(adapter, session.userId, WARN_STATUSES, 'active');
                  } catch (err) {
                    authContext.logger.error('Updating the user after sign-in failed', err);
                  }
                },
              },
            },
          },
        },
      };
    },

    hooks: {
      before: [
        {
          // Legacy doReset refuses a suspended user before changing the password
          matcher: (ctx) => ctx.path === ROUTES.resetPassword,
          handler: createAuthMiddleware(async (ctx) => {
            const token: unknown = ctx.body?.token || ctx.query?.token;
            if (typeof token !== 'string') {
              return;
            }
            const verification = await ctx.context.internalAdapter.findVerificationValue(
              `reset-password:${token}`,
            );
            if (!verification || verification.expiresAt < new Date()) {
              return;
            }
            const user = await ctx.context.internalAdapter.findUserById(verification.value);
            if (staffStatus(user) === 'inactive') {
              throw refusal('inactive');
            }
          }),
        },
      ],
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
            if (found && staffStatus(found.user) === 'locked') {
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
            origin: z.string(),
            // The API controllers' request, which Better Auth doesn't see
            ipAddress: z.string().optional(),
            userAgent: z.string().optional(),
          }),
        },
        async (ctx) => {
          const { userId, origin, ipAddress, userAgent } = ctx.body;
          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) {
            throw APIError.from('NOT_FOUND', BASE_ERROR_CODES.USER_NOT_FOUND);
          }
          // Hooks join the transaction; overrideAll keeps `verified` from its default
          const session = await runWithTransaction(ctx.context.adapter, () =>
            ctx.context.internalAdapter.createSession(
              userId,
              false,
              { verified: true, origin, ipAddress, userAgent },
              true,
            ),
          );
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ session, user });
        },
      ),

      /**
       * Every security event that signs a user out comes through here or `revokeAllSessions`
       * (native `/change-password` through the instance's own hook). Both also delete the app
       * tokens, which don't rely on cascading with the session: either may be stored apart.
       */
      revokeUserSessions: createAuthEndpoint.serverOnly(
        { method: 'POST', body: z.object({ userId: z.string() }) },
        async (ctx) => {
          await ctx.context.internalAdapter.deleteUserSessions(ctx.body.userId);
          await deleteAppTokens(ctx.context, { userId: ctx.body.userId });
          return ctx.json({ status: true });
        },
      ),

      revokeAllSessions: createAuthEndpoint.serverOnly({ method: 'POST' }, async (ctx) => {
        const adapter = await getCurrentAdapter(ctx.context.adapter);
        const count = await adapter.deleteMany({ model: 'session', where: [] });
        await deleteAppTokens(ctx.context, { all: true });
        return ctx.json({ count });
      }),
    },
  } satisfies BetterAuthPlugin;
};
