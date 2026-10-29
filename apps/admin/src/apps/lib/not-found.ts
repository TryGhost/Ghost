import { isUnconfirmedAppCode } from '@tryghost/app-contracts';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiErrorOf } from './install-failure';

/**
 * Whether reading an installation failed because it doesn't exist. Ghost returns 422, not 404, for
 * a malformed id. Both mean there's nothing to show, and retrying won't help with either.
 */
export function isInstallationNotFound(error: unknown): boolean {
  return error instanceof APIError && [404, 422].includes(error.response?.status ?? 0);
}

/**
 * Whether starting a session failed because Ghost has no route for it. Ghost versions from before
 * app sessions return a plain 404. Versions with the route return a 404 with their own code when an
 * app isn't installed.
 */
export function isSessionsRouteMissing(error: unknown): boolean {
  return (
    error instanceof APIError &&
    error.response?.status === 404 &&
    apiErrorOf(error)?.code !== 'APP_NOT_INSTALLED'
  );
}

/** Why starting a session failed, when Ghost couldn't use the app's manifest. */
export interface SessionFailure {
  /** The failure's own code, which the screen shows so the publisher can pass it on. */
  code: string;
  /**
   * Ghost couldn't confirm it's the app that was installed, rather than the app being down or
   * broken. The publisher is told to contact the developer, not to install it again.
   */
  unconfirmed: boolean;
}

/**
 * Why starting a session failed, if it was because of the app: Ghost answers 409 with the
 * failure's own code, and nothing changed, so trying again opens the app once it's fixed.
 */
export function sessionFailureOf(error: unknown): SessionFailure | undefined {
  if (!(error instanceof APIError) || error.response?.status !== 409) {
    return undefined;
  }
  const code = apiErrorOf(error)?.code;
  return typeof code === 'string' && code
    ? { code, unconfirmed: isUnconfirmedAppCode(code) }
    : undefined;
}
