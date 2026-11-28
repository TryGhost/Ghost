import type { BetterAuthPlugin, GenericEndpointContext } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { ROUTES } from '../routes';
import { allowsUnverifiedSession, recordUnverifiedSession } from './device-verification';
import { isActiveStaffStatus } from '../../../../shared/staff-status';
import { staffStatus } from './staff-lifecycle';

type Ctx = Pick<GenericEndpointContext, 'context' | 'headers'>;

/**
 * The request's headers without its session cookie, so the endpoint runs
 * anonymous. Other pairs keep their wire form: parseCookies decodes values,
 * which Headers can reject, and drops pairs it can't parse.
 */
export function withoutSessionCookie(ctx: Ctx): Headers {
  const name = ctx.context.authCookies.sessionToken.name;
  const cookie = (ctx.headers?.get('cookie') ?? '')
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair && pair.split('=')[0].trim() !== name)
    .join('; ');
  return new Headers({ cookie });
}

/**
 * Decides, from one lookup, whether the request's session cookie reaches the
 * endpoint (plan §5.4). Listed first, so it runs before every other plugin's
 * hooks. A session whose user is no longer active (one that outlived a
 * suspension in the create/revoke race) is deleted; an unverified one is
 * anonymous outside device verification and sign-out. Either way the
 * endpoint runs without the cookie, as resolvePrincipal treats it.
 */
export const ghostSessionGate = () =>
  ({
    id: 'ghost-session-gate',
    hooks: {
      before: [
        {
          // Sign-out deletes the session itself, so it needs no lookup
          matcher: (ctx) => ctx.path !== ROUTES.signOut && !!ctx.headers?.get('cookie'),
          handler: createAuthMiddleware(async (ctx) => {
            const token = await ctx.getSignedCookie(
              ctx.context.authCookies.sessionToken.name,
              ctx.context.secret,
            );
            const found = token ? await ctx.context.internalAdapter.findSession(token) : null;
            if (!token || !found) {
              return;
            }

            if (!isActiveStaffStatus(staffStatus(found.user))) {
              await ctx.context.internalAdapter.deleteSession(token);
              return { context: { headers: withoutSessionCookie(ctx) } };
            }

            // An additional field Better Auth returns but doesn't type
            const { session } = found;
            const verified = 'verified' in session ? session.verified : undefined;
            if (verified === true || allowsUnverifiedSession(ctx.path)) {
              return;
            }
            await recordUnverifiedSession(ctx, session);
            return { context: { headers: withoutSessionCookie(ctx) } };
          }),
        },
      ],
    },
  }) satisfies BetterAuthPlugin;
