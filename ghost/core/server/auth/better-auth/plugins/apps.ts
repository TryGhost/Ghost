import errors from '@tryghost/errors';
import { getCurrentAdapter } from '@better-auth/core/context';
import { isAPIError } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint } from 'better-auth/api';
import { jwt } from 'better-auth/plugins';
import {
  getOAuthProviderApi,
  oauthProvider,
  type OAuthOptions,
  type Scope,
  type SchemaClient,
} from '@better-auth/oauth-provider';
import { z } from 'zod';
import { ghostJwtSchema, ghostOAuthProviderSchema } from '../ghost-models';
import {
  APP_SESSION_GRANT,
  appClientId,
  appClientInstallationSchema,
  appClientOwnerOf,
  reconcileAppUserClient,
  type AppClientOwner,
} from './app-clients';
import { APP_TOKEN_PREFIX } from '../../app-token-prefix';
import { appTokenRequestSchema, type AppTokenRefusal, type ValidatedAppToken } from '../app-tokens';

export type AppProviderOptions = {
  /** Better Auth's `baseURL`: the admin origin */
  adminOrigin: string;
};

/** The provider's options, shared with the test that compares client rows with its own. */
export function appProviderOptions({ adminOrigin }: AppProviderOptions) {
  // No client can reach the authorize endpoint, so neither page is ever shown
  const adminPage = `${adminOrigin}/ghost/`;
  return {
    schema: ghostOAuthProviderSchema,
    loginPage: adminPage,
    consentPage: adminPage,
    // Ghost holds every token to the installation's approved scopes itself
    scopes: [],
    // Ghost issues every token itself, so the token endpoint accepts no grant and the
    // authorize endpoint answers 404
    grantTypes: [],
    // Provider-wide; ID tokens are only for apps
    idTokenExpiresIn: 300,
    prefix: { opaqueAccessToken: APP_TOKEN_PREFIX },
    // Clients are written by Ghost; nobody manages them through the provider's endpoints
    clientPrivileges: () => false,
  } satisfies OAuthOptions<Scope[]>;
}

/** The provider and the jwt plugin it signs with, registered only while apps can use them. */
export function appOAuthPlugins(options: AppProviderOptions) {
  return [
    jwt({ schema: ghostJwtSchema, disableSettingJwtHeader: true }),
    oauthProvider(appProviderOptions(options)),
  ] as const;
}

/**
 * The provider and jwt routes left mounted. Ghost issues and validates app tokens through the
 * provider's server API, so it serves none of them.
 */
export const APP_OAUTH_MOUNTED_PATHS: readonly string[] = [];

/**
 * Every path the plugins declare but the mounted ones, so a route an upgrade adds is disabled
 * too. Server-only paths are included: the provider serves its metadata paths from `onRequest`.
 */
export function appOAuthDisabledPaths(plugins: readonly BetterAuthPlugin[]): string[] {
  const paths = plugins.flatMap((plugin) =>
    Object.values(plugin.endpoints ?? {}).map((endpoint) => endpoint.path),
  );
  return [...new Set(paths)].filter(
    (path): path is string => !!path && !APP_OAUTH_MOUNTED_PATHS.includes(path),
  );
}

/**
 * Ghost's app endpoints, all server-only. With `app-clients.ts`, the one place that knows the
 * provider's table layout. Registered always, so `auth.api`'s type doesn't depend on the `apps`
 * flag; only `AppTokens` calls them, and only once the provider is registered.
 *
 * `providerOptions` are the registered provider plugin's own, which carry its defaults, or null
 * when it isn't registered.
 */
export const ghostApps = (providerOptions: OAuthOptions<Scope[]> | null) =>
  ({
    id: 'ghost-apps',

    endpoints: {
      /** Makes an installation's user client match it; see `reconcileAppUserClient`. */
      reconcileAppClient: createAuthEndpoint.serverOnly(
        { method: 'POST', body: appClientInstallationSchema },
        async (ctx) => {
          await reconcileAppUserClient(await getCurrentAdapter(ctx.context.adapter), ctx.body);
          return ctx.json({ status: true });
        },
      ),

      /**
       * An app user token for an installation's user client, bound to a staff session of the
       * user's that is verified and unexpired, and lasting no longer than it. The provider
       * checks no scopes when issuing, so `scopes` must already be narrowed to the
       * installation's approved scopes; any the client doesn't list are dropped. The client's
       * scopes apply only here: each request a token makes is authorised from the
       * installation's scopes approved at the time. No refresh or ID token is issued.
       */
      issueAppUserToken: createAuthEndpoint.serverOnly(
        { method: 'POST', body: appTokenRequestSchema },
        async (ctx) => {
          const refuse = (refused: AppTokenRefusal) => ctx.json({ token: null, refused });
          const options = registered(providerOptions);
          const owner: AppClientOwner = { installationId: ctx.body.installationId, kind: 'user' };
          // The provider's own typed row; `appClientOwnerOf` parses the metadata Ghost wrote into it
          const client = await getOAuthProviderApi(ctx, options).getClient(appClientId(owner));
          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          if (!client || client.disabled || !isClientOf(client, owner)) {
            return refuse('client_unavailable');
          }
          if (!user) {
            return refuse('user_not_found');
          }
          const session = await findStaffSession(ctx, ctx.body.sessionId);
          if (!isUsableStaffSession(session, ctx.body.userId)) {
            return refuse('session_unavailable');
          }
          // Validation stops accepting the token when the session ends, so it lasts no longer
          const sessionSecondsLeft = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
          const provider = getOAuthProviderApi(
            ctx,
            {
              ...options,
              accessTokenExpiresIn: Math.min(
                options.accessTokenExpiresIn ?? DEFAULT_ACCESS_TOKEN_SECONDS,
                sessionSecondsLeft,
              ),
            },
            APP_SESSION_GRANT,
          );
          const allowed = new Set(client.scopes ?? []);
          const scopes = [...new Set(ctx.body.scopes)].filter((scope) => allowed.has(scope));
          const issued = await provider.issueTokens({
            client,
            user,
            scopes,
            sessionId: ctx.body.sessionId,
          });
          return ctx.json({
            refused: null,
            token: {
              accessToken: issued.access_token,
              expiresIn: issued.expires_in,
            },
          });
        },
      ),

      /** Who an app token acts for, or null unless it is an active app user token. */
      validateAppToken: createAuthEndpoint.serverOnly(
        { method: 'POST', body: z.object({ token: z.string() }) },
        async (ctx) => {
          const provider = getOAuthProviderApi(ctx, registered(providerOptions));
          let payload;
          try {
            payload = await provider.validateAccessToken(ctx.body.token);
          } catch (err) {
            if (isAPIError(err)) {
              return ctx.json({ token: null });
            }
            throw err;
          }
          const parsed = appUserTokenPayloadSchema.safeParse(payload);
          if (!parsed.success) {
            return ctx.json({ token: null });
          }
          const { client_id: clientId, sub: userId, sid: sessionId } = parsed.data;
          const client = await provider.getClient(clientId);
          const owner = client ? appClientOwnerOf(client) : null;
          // The provider checks the session exists and hasn't expired, but not that it's verified
          const session = await findStaffSession(ctx, sessionId);
          if (owner?.kind !== 'user' || !isUsableStaffSession(session, userId)) {
            return ctx.json({ token: null });
          }
          const validated: ValidatedAppToken = {
            installationId: owner.installationId,
            userId,
            session: {
              id: session.id,
              expiresAt: session.expiresAt,
              origin: session.origin ?? null,
            },
          };
          return ctx.json({ token: validated });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;

/**
 * What validation needs of an introspected token. A JWT access token has an audience; apps never
 * get one. App user tokens are always issued with a user and a staff session.
 */
const appUserTokenPayloadSchema = z.object({
  active: z.literal(true),
  aud: z.never().optional(),
  client_id: z.string(),
  sub: z.string(),
  sid: z.string(),
});

/** What app tokens need of a staff session row; the adapter returns the other columns too. */
const staffSessionRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.union([z.date(), z.string(), z.number()]).pipe(z.coerce.date()),
  verified: z.boolean().nullish(),
  origin: z.string().nullish(),
});

type StaffSessionRow = z.infer<typeof staffSessionRowSchema>;

// The provider's default app user token lifetime
const DEFAULT_ACCESS_TOKEN_SECONDS = 3600;

async function findStaffSession(
  ctx: { context: { adapter: Parameters<typeof getCurrentAdapter>[0] } },
  sessionId: string,
): Promise<StaffSessionRow | null> {
  const adapter = await getCurrentAdapter(ctx.context.adapter);
  const row = await adapter.findOne<unknown>({
    model: 'session',
    where: [{ field: 'id', value: sessionId }],
  });
  const parsed = staffSessionRowSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

/** A staff session an app token can be issued in or used with: the user's, verified, unexpired */
function isUsableStaffSession(
  session: StaffSessionRow | null,
  userId: string,
): session is StaffSessionRow {
  return (
    !!session &&
    session.userId === userId &&
    session.verified === true &&
    session.expiresAt > new Date()
  );
}

function registered(providerOptions: OAuthOptions<Scope[]> | null): OAuthOptions<Scope[]> {
  if (!providerOptions) {
    throw new errors.IncorrectUsageError({
      message: "Better Auth's OAuth provider is not registered",
    });
  }
  return providerOptions;
}

function isClientOf(client: SchemaClient<Scope[]>, owner: AppClientOwner): boolean {
  const found = appClientOwnerOf(client);
  return found?.installationId === owner.installationId && found.kind === owner.kind;
}
