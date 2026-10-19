import { APIError } from '@tryghost/admin-x-framework/errors';

/**
 * Whether reading an installation failed because there is none to read. Ghost answers a
 * malformed id with 422, not 404; both mean there's nothing to show, and retrying won't
 * help with either.
 */
export function isInstallationNotFound(error: unknown): boolean {
  return error instanceof APIError && [404, 422].includes(error.response?.status ?? 0);
}
