import { APIError } from '@tryghost/admin-x-framework/errors';
import { apiErrorOf } from './install-failure';

/**
 * Whether reading an installation failed because there is none to read. Ghost answers a
 * malformed id with 422, not 404; both mean there's nothing to show, and retrying won't
 * help with either.
 */
export function isInstallationNotFound(error: unknown): boolean {
  return error instanceof APIError && [404, 422].includes(error.response?.status ?? 0);
}

/**
 * Whether starting a session failed because Ghost has no route for it: a Ghost from before
 * app sessions answers its plain 404. One that has the route says an app isn't installed
 * with a 404 of its own code.
 */
export function isSessionsRouteMissing(error: unknown): boolean {
  return (
    error instanceof APIError &&
    error.response?.status === 404 &&
    apiErrorOf(error)?.code !== 'APP_NOT_INSTALLED'
  );
}
