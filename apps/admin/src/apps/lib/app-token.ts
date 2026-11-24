import type { AppSessionToken } from '@tryghost/admin-x-framework/api/app-installations';
import { SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { endsAppSession, failureOfResponse, isRefusedToken } from './app-failure';

/** Renewed this long before the token expires: about 50 minutes into its hour. */
const RENEW_BEFORE_EXPIRY_MS = 10 * 60 * 1000;
/**
 * The soonest a renewal follows the last one, so a token that's due early, such as one Ghost
 * issues for less than its usual hour, isn't renewed back to back.
 */
const MIN_RENEW_DELAY_MS = 5 * 60 * 1000;
/** A renewal that failed otherwise is tried again after this, doubling each time. */
const RETRY_MS = 60 * 1000;
/** Consecutive failed renewals that end the session. */
const MAX_FAILED_RENEWALS = 5;
/** `setTimeout` fires at once for a longer delay. */
const MAX_DELAY_MS = 2 ** 31 - 1;

/** What `createAdminApiFetch` sends an app's calls with. */
export interface AppTokenSource {
  /**
   * Sends a call with the current token. A call refused because the token is no longer valid,
   * such as one that expired while the computer slept, is sent once more: with the token held
   * now if another call already renewed it, otherwise after renewing it. Resolves to the last
   * response.
   */
  send(call: (token: string) => Promise<Response>): Promise<Response>;
}

/** How the holder renews, and what it does when Ghost refuses a renewal. */
export interface AppTokenRenewal {
  renew: () => Promise<AppSessionToken>;
  /** Ends the session the way Admin ends one */
  onEnded: () => void;
}

export interface AppTokenHolder extends AppTokenSource {
  /** The current token's value. */
  current(): string;
  /**
   * Renews the token now, sharing a renewal already under way. Resolves to whether there's a
   * new token; false when Ghost refused it, which ends the session.
   */
  renew(): Promise<boolean>;
  /**
   * Starts renewing before the token expires, the way `renewal` says. Safe to call again after
   * `stop`, with the latest `renewal`.
   */
  start(renewal: AppTokenRenewal): void;
  stop(): void;
}

/**
 * Holds an app session's token, owned by the session and outside React state, so renewing it
 * never re-renders or reloads the app's frame. It renews ahead of expiry, and on demand when a
 * call is refused because the token expired, such as after a laptop slept. A renewal Ghost
 * refuses ends the session through `onEnded`, as does one that keeps failing. A staff session
 * that expired is handled by Admin's API layer, which sends the publisher to sign in.
 */
export function createAppTokenHolder({
  token,
  onError,
}: {
  token: AppSessionToken;
  onError: (error: unknown) => void;
}): AppTokenHolder {
  let current = token;
  // On the browser's clock, from when the token arrived, so it doesn't matter if it differs from
  // Ghost's. The first token arrived just before the holder was made.
  let expiresAt = Date.now() + token.expires_in * 1000;
  let ended = false;
  let renewal: AppTokenRenewal | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let renewing: Promise<boolean> | undefined;
  let failures = 0;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    timer = renewal
      ? setTimeout(() => void holder.renew(), Math.min(Math.max(0, delay), MAX_DELAY_MS))
      : undefined;
  };
  const untilRenewal = () => expiresAt - RENEW_BEFORE_EXPIRY_MS - Date.now();
  const stopRenewing = () => {
    ended = true;
    clearTimeout(timer);
    timer = undefined;
  };
  const end = () => {
    stopRenewing();
    // The session this holder is running for now; none once stopped
    renewal?.onEnded();
  };

  const holder: AppTokenHolder = {
    current: () => current.access_token,

    async send(call) {
      const sent = current.access_token;
      const response = await call(sent);
      // Renews only a token that's still the one held: another call may have renewed it already
      if (
        isRefusedToken(await failureOfResponse(response)) &&
        (current.access_token !== sent || (await holder.renew()))
      ) {
        return call(current.access_token);
      }
      return response;
    },

    renew() {
      if (ended || !renewal) {
        return Promise.resolve(false);
      }
      renewing ??= renewal
        .renew()
        .then((next) => {
          current = next;
          expiresAt = Date.now() + next.expires_in * 1000;
          failures = 0;
          schedule(Math.max(MIN_RENEW_DELAY_MS, untilRenewal()));
          return true;
        })
        .catch((error: unknown) => {
          if (endsAppSession(error)) {
            end();
            return false;
          }
          // Admin's API layer found the staff session expired and is signing in again
          if (error instanceof SessionExpiredError) {
            stopRenewing();
            return false;
          }
          onError(error);
          failures += 1;
          if (failures >= MAX_FAILED_RENEWALS) {
            end();
          } else {
            schedule(RETRY_MS * 2 ** (failures - 1));
          }
          return false;
        })
        .finally(() => {
          renewing = undefined;
        });
      return renewing;
    },

    start(next) {
      renewal = next;
      if (!ended) {
        schedule(untilRenewal());
      }
    },

    stop() {
      renewal = undefined;
      clearTimeout(timer);
      timer = undefined;
    },
  };
  return holder;
}
