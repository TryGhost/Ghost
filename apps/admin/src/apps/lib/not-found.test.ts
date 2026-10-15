import { describe, expect, it } from 'vitest';
import { type ErrorResponse, JSONError } from '@tryghost/admin-x-framework/errors';
import { isAppUnavailable, isInstallationNotFound, isSessionsRouteMissing } from './not-found';

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

describe('isAppUnavailable', () => {
  it('reads Ghost’s 409 for a manifest it couldn’t use as the app being unavailable', () => {
    expect(isAppUnavailable(apiError(409, 'APP_UNAVAILABLE'))).toBe(true);
    expect(isInstallationNotFound(apiError(409, 'APP_UNAVAILABLE'))).toBe(false);
  });

  it('leaves other failures alone', () => {
    expect(isAppUnavailable(apiError(409, null))).toBe(false);
    expect(isAppUnavailable(apiError(404, 'APP_NOT_INSTALLED'))).toBe(false);
    expect(isAppUnavailable(new Error('offline'))).toBe(false);
  });
});
