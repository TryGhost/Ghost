import { APIError } from '@tryghost/admin-x-framework/errors';

/**
 * Whether reading an installation failed because it doesn't exist. Ghost answers an unknown id
 * with a 404 that has no code, and a malformed one with a 422, so this reads the status. Both mean
 * there's nothing to show, and retrying won't help with either.
 */
export function isInstallationNotFound(error: unknown): boolean {
  return error instanceof APIError && [404, 422].includes(error.response?.status ?? 0);
}
