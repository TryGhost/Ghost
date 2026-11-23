import { describe, expect, it } from 'vitest';
import { type ErrorResponse, JSONError } from '@tryghost/admin-x-framework/errors';
import { isInstallationNotFound } from './not-found';

const apiError = (status: number, code: string | null) =>
  new JSONError(new Response(null, { status }), {
    errors: [{ code, message: 'Not found' }],
  } as unknown as ErrorResponse);

describe('isInstallationNotFound', () => {
  it('treats any 404, or a 422 for a malformed id, as nothing to show', () => {
    expect(isInstallationNotFound(apiError(404, 'APP_NOT_INSTALLED'))).toBe(true);
    expect(isInstallationNotFound(apiError(404, null))).toBe(true);
    expect(isInstallationNotFound(apiError(422, null))).toBe(true);
  });

  it('leaves other failures alone', () => {
    expect(isInstallationNotFound(apiError(500, null))).toBe(false);
    expect(isInstallationNotFound(new Error('offline'))).toBe(false);
  });
});
