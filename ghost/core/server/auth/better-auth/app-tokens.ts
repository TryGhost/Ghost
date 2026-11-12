import { getOAuthProviderApi, type OAuthOptions, type Scope } from '@better-auth/oauth-provider';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth/types';
import { z } from 'zod';

/**
 * The only grant an app's user client has. The provider doesn't know it, so it refuses the
 * client at `/oauth2/authorize`, and Ghost issues the client's tokens itself at app-session
 * start. It must not be empty: the provider treats no grants as `authorization_code`.
 */
export const APP_SESSION_GRANT = 'urn:ghost:params:oauth:grant-type:app-session';

/** Client ids aren't secrets, so the user client's id is derived from the installation. */
export const appUserClientId = (installationId: string) => `ghost-app-${installationId}`;

const IssueBody = z.object({
  installationId: z.string(),
  userId: z.string(),
  sessionId: z.string(),
  scopes: z.array(z.string()),
});

const ClientBody = z.object({
  installationId: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
});

function providerApi(ctx: Parameters<typeof getOAuthProviderApi>[0]) {
  const provider = ctx.context.getPlugin('oauth-provider');
  if (!provider) {
    throw new APIError('INTERNAL_SERVER_ERROR', { message: 'The OAuth provider is not installed' });
  }
  return getOAuthProviderApi(
    ctx,
    provider.options as OAuthOptions<Scope[]>,
    APP_SESSION_GRANT as never,
  );
}

/**
 * Ghost's server-only entry points to the OAuth provider for apps. `SERVER_ONLY` endpoints
 * are reachable through `auth.api` only, never over HTTP.
 */
export const ghostAppTokens = () =>
  ({
    id: 'ghost-app-tokens',
    endpoints: {
      /** Writes an installation's user client. It has no owner, so only Ghost can change it. */
      createAppUserClient: createAuthEndpoint(
        '/ghost-apps/user-client',
        { method: 'POST', body: ClientBody, metadata: { SERVER_ONLY: true } },
        async (ctx) => {
          const now = new Date();
          await ctx.context.adapter.create({
            model: 'oauthClient',
            data: {
              clientId: appUserClientId(ctx.body.installationId),
              name: ctx.body.name,
              disabled: false,
              skipConsent: true,
              // With it on, app code holding an ID token could sign the staff user out
              enableEndSession: false,
              scopes: ['openid', ...ctx.body.scopes],
              // No redirect URIs and only the marker grant: no code can ever be issued for it
              redirectUris: [],
              grantTypes: [APP_SESSION_GRANT],
              responseTypes: [],
              tokenEndpointAuthMethod: 'none',
              metadata: { ghostApp: { installationId: ctx.body.installationId } },
              createdAt: now,
              updatedAt: now,
            },
          });
          return ctx.json({ clientId: appUserClientId(ctx.body.installationId) });
        },
      ),

      /**
       * Issues the staff user's access token and ID token for an app session. The caller has
       * already checked that the staff session is signed in and verified.
       */
      issueAppUserTokens: createAuthEndpoint(
        '/ghost-apps/user-tokens',
        { method: 'POST', body: IssueBody, metadata: { SERVER_ONLY: true } },
        async (ctx) => {
          const api = providerApi(ctx);
          const client = await api.getClient(appUserClientId(ctx.body.installationId));
          if (!client || client.disabled) {
            throw new APIError('FORBIDDEN', { message: 'The app is not available' });
          }
          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          if (!user) {
            throw new APIError('UNAUTHORIZED', { message: 'No such user' });
          }
          // `issueTokens` checks no scopes, unlike the provider's own grants. Narrowing to the
          // client's scopes here is what keeps an app within what an Administrator approved.
          const scopes = ctx.body.scopes.filter((scope) => client.scopes?.includes(scope));
          return api.issueTokens({
            client,
            user,
            scopes,
            // Ties the token to the staff session: it stops working when the session ends
            sessionId: ctx.body.sessionId,
            authTime: new Date(),
          });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
