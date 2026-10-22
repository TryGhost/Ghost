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

/**
 * The codes a session fails with when Ghost couldn't use the app's manifest: `APP_UNAVAILABLE`
 * when it couldn't be loaded or was for a different app, and the identity check's own codes
 * when it couldn't confirm the app is the one installed.
 */
const UNAVAILABLE_CODES: ReadonlySet<unknown> = new Set([
  'APP_UNAVAILABLE',
  'APP_MANIFEST_UNSIGNED',
  'APP_MANIFEST_URL_MISMATCH',
  'APP_MANIFEST_SIGNATURE_INVALID',
  'APP_IDENTITY_MISMATCH',
  'APP_BACKEND_KEY_RETIRED',
  'APP_CHALLENGE_FAILED',
  'APP_CHALLENGE_UNREACHABLE',
]);

/**
 * Whether starting a session failed because Ghost couldn't use the app's manifest, or couldn't
 * confirm it's the app that was installed. This is the app's fault, not Admin's, and nothing
 * changed, so trying again opens the app once it's fixed.
 */
export function isAppUnavailable(error: unknown): boolean {
  return (
    error instanceof APIError &&
    error.response?.status === 409 &&
    UNAVAILABLE_CODES.has(apiErrorOf(error)?.code)
  );
}
