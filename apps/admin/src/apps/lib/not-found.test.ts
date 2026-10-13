import { describe, expect, it } from 'vitest';
import { type ErrorResponse, JSONError } from '@tryghost/admin-x-framework/errors';
import { isInstallationNotFound, isSessionsRouteMissing } from './not-found';

const apiError = (status: number, code: string | null) =>
  new JSONError(new Response(null, { status }), {
    errors: [{ code, message: 'Not found' }],
  } as unknown as ErrorResponse);

describe('isSessionsRouteMissing', () => {
  it('reads Ghost’s plain 404 as a Ghost without app sessions', () => {
    expect(isSessionsRouteMissing(apiError(404, null))).toBe(true);
  });

  it('reads a 404 that says the app isn’t installed as just that', () => {
    expect(isSessionsRouteMissing(apiError(404, 'APP_NOT_INSTALLED'))).toBe(false);
    expect(isInstallationNotFound(apiError(404, 'APP_NOT_INSTALLED'))).toBe(true);
  });

  it('leaves other failures alone', () => {
    expect(isSessionsRouteMissing(apiError(422, null))).toBe(false);
    expect(isSessionsRouteMissing(apiError(500, null))).toBe(false);
    expect(isSessionsRouteMissing(new Error('offline'))).toBe(false);
  });
});
