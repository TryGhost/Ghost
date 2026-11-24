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
/**
 * A renewal that failed otherwise is tried again after this, doubling each time. Nothing asks
 * Ghost again sooner than this after a failed renewal.
 */
const RETRY_MS = 60 * 1000;
/** Consecutive failed renewals after which the timer stops trying. */
const MAX_TIMED_RENEWALS = 5;
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
  /** Ghost's answer, which the holder checks is a token before using it. */
  renew: () => Promise<AppSessionToken | undefined>;
  /** Ends the session the way Admin ends one */
  onEnded: () => void;
}

export interface AppTokenHolder extends AppTokenSource {
  /**
   * Renews the token now, sharing a renewal already under way. Resolves to whether there's a
   * new token: false when Ghost refused it, which ends the session, when it failed, and without
   * asking within a minute of a renewal that failed.
   */
  renew(): Promise<boolean>;
  /**
   * Starts renewing before the token expires, the way `renewal` says. Safe to call again after
   * `stop`, with the latest `renewal`.
   */
  start(renewal: AppTokenRenewal): void;
  stop(): void;
}

function isToken(token: AppSessionToken | undefined): token is AppSessionToken {
  return (
    typeof token?.access_token === 'string' &&
    token.access_token !== '' &&
    typeof token.expires_in === 'number' &&
    token.expires_in > 0
  );
}

/**
 * Holds an app session's token, owned by the session and outside React state, so renewing it
 * never re-renders or reloads the app's frame. It renews ahead of expiry, and on demand when a
 * call is refused because the token expired, such as after a laptop slept.
 *
 * - A renewal Ghost refuses ends the session through `onEnded`.
 * - A staff session that expired stops renewing, and is left to Admin's API layer, which sends
 *   the publisher to sign in.
 * - A renewal that fails otherwise, such as with Ghost unreachable, keeps the session and the
 *   app's frame, and its unsaved work with it. The timer tries again after 1, 2, 4 and 8 minutes,
 *   then stops; from then the next call Ghost refuses for its token renews it, so the app
 *   recovers once Ghost answers. A call that renews on demand shares the timer's backoff: no
 *   renewal is asked for within a minute of one that failed. Only the first failure of a run is
 *   reported.
 */
export function createAppTokenHolder({
  token,
  receivedAt,
  onError,
}: {
  token: AppSessionToken;
  /** When the token arrived, by `Date.now()`, which can be well before the holder is made. */
  receivedAt: number;
  onError: (error: unknown) => void;
}): AppTokenHolder {
  let current = token;
  // On the browser's clock, from when the token arrived, so it doesn't matter if it differs from
  // Ghost's.
  let expiresAt = receivedAt + token.expires_in * 1000;
  let ended = false;
  let renewal: AppTokenRenewal | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let renewing: Promise<boolean> | undefined;
  let failures = 0;
  let failedAt = 0;
  // Ghost refused a renewal while the holder was stopped, which ends the session once started
  let endedWhileStopped = false;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    timer = renewal
      ? setTimeout(() => void holder.renew(), Math.min(Math.max(0, delay), MAX_DELAY_MS))
      : undefined;
  };
  const untilRenewal = () => expiresAt - RENEW_BEFORE_EXPIRY_MS - Date.now();
  const scheduleRetry = () => {
    if (failures < MAX_TIMED_RENEWALS) {
      schedule(failedAt + RETRY_MS * 2 ** (failures - 1) - Date.now());
    } else {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const stopRenewing = () => {
    ended = true;
    clearTimeout(timer);
    timer = undefined;
  };
  const end = () => {
    stopRenewing();
    if (renewal) {
      renewal.onEnded();
    } else {
      endedWhileStopped = true;
    }
  };

  const holder: AppTokenHolder = {
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
      if (renewing) {
        return renewing;
      }
      if (ended || !renewal || (failures > 0 && Date.now() - failedAt < RETRY_MS)) {
        return Promise.resolve(false);
      }
      renewing = renewal
        .renew()
        .then((next) => {
          if (!isToken(next)) {
            throw new Error('Ghost renewed an app token without a token');
          }
          current = next;
          expiresAt = Date.now() + next.expires_in * 1000;
          failures = 0;
          schedule(Math.max(MIN_RENEW_DELAY_MS, untilRenewal()));
          return true;
        })
        .catch((error: unknown) => {
          // Admin's API layer found the staff session expired and is signing in again. Checked
          // first: Ghost refuses a request with no staff session as a `NoPermissionError`, which
          // would otherwise end the app session and start another that's refused too.
          if (error instanceof SessionExpiredError) {
            stopRenewing();
            return false;
          }
          if (endsAppSession(error)) {
            end();
            return false;
          }
          if (failures === 0) {
            onError(error);
          }
          failures += 1;
          failedAt = Date.now();
          scheduleRetry();
          return false;
        })
        .finally(() => {
          renewing = undefined;
        });
      return renewing;
    },

    start(next) {
      renewal = next;
      if (endedWhileStopped) {
        endedWhileStopped = false;
        next.onEnded();
      }
      if (ended) {
        return;
      }
      if (failures > 0) {
        scheduleRetry();
      } else {
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
