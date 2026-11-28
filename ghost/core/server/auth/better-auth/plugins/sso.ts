import { getCurrentAdapter, runWithTransaction } from '@better-auth/core/context';
import { APIError, BASE_ERROR_CODES } from '@better-auth/core/error';
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { admitStaffUser, type StaffUser } from './staff-lifecycle';

/**
 * Sessions for the `@tryghost/adapter-base-sso` contract, which Ghost(Pro)
 * support access implements (plan §3.3). The adapter resolves the user;
 * team SSO is `@better-auth/sso`.
 */
export const ghostSso = () =>
  ({
    id: 'ghost-sso',

    endpoints: {
      /** A verified session for a user the SSO adapter resolved; SSO sign-in is passwordless */
      createSsoSession: createAuthEndpoint.serverOnly(
        {
          method: 'POST',
          body: z.object({
            userId: z.string(),
            origin: z.string(),
          }),
        },
        async (ctx) => {
          const { userId, origin } = ctx.body;
          const session = await runWithTransaction(ctx.context.adapter, async () => {
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            const found = await adapter.findOne<StaffUser>({
              model: 'user',
              where: [{ field: 'id', value: userId }],
            });
            if (!found) {
              throw APIError.from('NOT_FOUND', BASE_ERROR_CODES.USER_NOT_FOUND);
            }
            await admitStaffUser(adapter, found, { passwordless: true });
            // overrideAll keeps `verified` from its default
            return ctx.context.internalAdapter.createSession(
              userId,
              false,
              { verified: true, origin },
              true,
            );
          });
          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) {
            throw APIError.from('NOT_FOUND', BASE_ERROR_CODES.USER_NOT_FOUND);
          }
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ session, user });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
