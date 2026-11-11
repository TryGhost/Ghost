import type { AppUserTokens } from '@tryghost/admin-x-framework/api/app-installations';

/** Renews a little early, so no call leaves with a token that expires on the way. */
const RENEW_MARGIN_SECONDS = 30;

export interface AppTokens {
  /** For the app's Admin API calls, which Admin sends. The frame never sees it. */
  accessToken: () => Promise<string>;
  /** For the frame, which sends it to the app's backend. */
  idToken: () => Promise<string>;
}

/**
 * Holds the staff user's tokens for one app session. When one is about to expire, `renew` starts
 * a new app session on the server, which re-checks the app and issues both tokens again. Renewal
 * happens when a token is needed, not on a timer, so a laptop waking from sleep renews cleanly.
 */
export function createAppTokens(
  initial: AppUserTokens,
  renew: () => Promise<AppUserTokens>,
): AppTokens {
  let current = initial;
  let renewing: Promise<AppUserTokens> | undefined;

  const isFresh = (expiresAt: number) => expiresAt - RENEW_MARGIN_SECONDS > Date.now() / 1000;

  const renewOnce = async () => {
    // Calls that need a token while a renewal runs share it
    renewing ??= renew().finally(() => {
      renewing = undefined;
    });
    current = await renewing;
    return current;
  };

  return {
    accessToken: async () =>
      isFresh(current.expires_at) ? current.access_token : (await renewOnce()).access_token,
    idToken: async () =>
      isFresh(current.id_token_expires_at) ? current.id_token : (await renewOnce()).id_token,
  };
}
