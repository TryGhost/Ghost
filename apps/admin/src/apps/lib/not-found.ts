import { APIError } from '@tryghost/admin-x-framework/errors';

/**
 * Whether reading an installation failed because there is none to read. Ghost answers a
 * malformed id with 422, not 404; both mean there's nothing to show, and retrying won't
 * help with either.
 */
export function isInstallationNotFound(error: unknown): boolean {
  return error instanceof APIError && [404, 422].includes(error.response?.status ?? 0);
}

/** The code Ghost gives the error, if it gave one. */
function errorCode(error: APIError): string | undefined {
  const data = error.data as { errors?: Array<{ code?: unknown }> } | undefined;
  const code = data?.errors?.[0]?.code;
  return typeof code === 'string' ? code : undefined;
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
    errorCode(error) !== 'APP_NOT_INSTALLED'
  );
}
