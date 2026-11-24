import errors from '@tryghost/errors';
import type { GhostAuth } from './create-auth';

/** What an installation's OAuth client is kept in step with. */
export interface AppTokenInstallation {
  id: string;
  active: boolean;
  scopes: readonly string[];
}

/** A user token for an app session, bound to the staff session it was issued in. */
export interface AppTokenRequest {
  installationId: string;
  userId: string;
  sessionId: string;
  /** The provider checks no scopes, so these must be the installation's approved ones */
  scopes: readonly string[];
}

/** A user token issued at app session start or renewal. */
export interface IssuedAppToken {
  accessToken: string;
  /** Seconds from when it was issued */
  expiresIn: number;
}

/** Why no token was issued: the installation's client is missing or disabled, or the user is gone. */
export type AppTokenRefusal = 'client_unavailable' | 'user_not_found';

/**
 * Whether app tokens can be issued here. The legacy engine runs no OAuth provider. Under
 * Better Auth the provider is registered at boot, only when the `apps` flag is on and its
 * tables exist, so turning the flag on needs a restart.
 */
export type AppTokensAvailability = 'ready' | 'legacy_engine' | 'needs_restart';

/** Who an app token acts for, in which installation, and the staff session it's bound to. */
export interface ValidatedAppToken {
  installationId: string;
  userId: string;
  /** Verified and unexpired, as validation found it */
  session: { id: string; expiresAt: Date; origin: string | null };
}

/**
 * App tokens, as the app installations service and the Admin API use them. Nothing here names
 * an OAuth client: which client a token belongs to stays inside the provider's plugin.
 */
export interface AppTokens {
  /** Until it's `ready`, nothing is issued or validated, and the other writes do nothing */
  availability(): AppTokensAvailability;
  /**
   * Makes the installation's user client match it. Not part of the installation's
   * transaction: the installation is checked on every call, and the next run heals a
   * failed write.
   */
  reconcileClient(installation: AppTokenInstallation): Promise<void>;
  issue(request: AppTokenRequest): Promise<IssuedAppToken | { refused: AppTokenRefusal }>;
  /**
   * Null unless the token is an active user token of an app's, issued in a staff session that
   * still exists, is verified and hasn't expired
   */
  validate(token: string): Promise<ValidatedAppToken | null>;
}

export type AppTokensDeps = {
  /** auth:engine, which is fixed for the process */
  isBetterAuth(): boolean;
  /** Read per call: the instance is built by boot. Only called under Better Auth */
  getAuth(): {
    api: Pick<GhostAuth['api'], 'reconcileAppClient' | 'issueAppUserToken' | 'validateAppToken'>;
    /** Whether boot registered the OAuth provider */
    hasAppProvider: boolean;
  };
};

/** App tokens from Better Auth's OAuth provider, through Ghost's `ghostApps` plugin. */
export function createAppTokens(deps: AppTokensDeps): AppTokens {
  const availability = (): AppTokensAvailability => {
    if (!deps.isBetterAuth()) {
      return 'legacy_engine';
    }
    return deps.getAuth().hasAppProvider ? 'ready' : 'needs_restart';
  };
  /** Ghost's app endpoints, or null while the provider isn't registered */
  const ready = () => (availability() === 'ready' ? deps.getAuth().api : null);

  return {
    availability,

    async reconcileClient(installation) {
      await ready()?.reconcileAppClient({
        body: {
          installationId: installation.id,
          active: installation.active,
          scopes: [...installation.scopes],
        },
      });
    },

    async issue(request) {
      const api = ready();
      if (!api) {
        throw new errors.InternalServerError({
          message: `App tokens are unavailable (${availability()}), so none can be issued.`,
        });
      }
      const { token, refused } = await api.issueAppUserToken({
        body: { ...request, scopes: [...request.scopes] },
      });
      return token ? { accessToken: token.accessToken, expiresIn: token.expiresIn } : { refused };
    },

    async validate(token) {
      const api = ready();
      const validated = api ? (await api.validateAppToken({ body: { token } })).token : null;
      return validated
        ? {
            ...validated,
            session: { ...validated.session, expiresAt: new Date(validated.session.expiresAt) },
          }
        : null;
    },
  };
}

/** The OAuth provider plugin's id. */
export const APP_PROVIDER_ID = 'oauth-provider';

/** What app tokens need from a Better Auth instance. */
export function appTokensAuth(auth: GhostAuth): ReturnType<AppTokensDeps['getAuth']> {
  return {
    api: auth.api,
    hasAppProvider: auth.options.plugins?.some(({ id }) => id === APP_PROVIDER_ID) ?? false,
  };
}

let appTokens: AppTokens | undefined;

/** Safe under either engine: Better Auth is loaded only once app tokens are used under it. */
export default function getAppTokens(): AppTokens {
  appTokens ??= createAppTokens({
    isBetterAuth: () => require('../index').isBetterAuth,
    getAuth: () => appTokensAuth(require('./index').default.service),
  });
  return appTokens;
}
