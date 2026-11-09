import { describe, expect, it } from 'vitest';
import { type ErrorResponse, JSONError } from '@tryghost/admin-x-framework/errors';
import { isInstallationNotFound, sessionFailureOf } from './not-found';

const apiError = (status: number, code: string | null) =>
  new JSONError(new Response(null, { status }), {
    errors: [{ code, message: 'Not found' }],
  } as unknown as ErrorResponse);

describe('isInstallationNotFound', () => {
  it('treats a 404 with APP_NOT_INSTALLED as the app not being installed', () => {
    expect(isInstallationNotFound(apiError(404, 'APP_NOT_INSTALLED'))).toBe(true);
  });
});

describe('sessionFailureOf', () => {
  it('reads a 409 as a failure of the app, with its own code', () => {
    expect(sessionFailureOf(apiError(409, 'APP_MANIFEST_UNREACHABLE'))).toEqual({
      code: 'APP_MANIFEST_UNREACHABLE',
      unconfirmed: false,
    });
    expect(isInstallationNotFound(apiError(409, 'APP_MANIFEST_UNREACHABLE'))).toBe(false);
  });

  it.each(['APP_IDENTITY_MISMATCH', 'APP_CHALLENGE_FAILED', 'APP_BACKEND_KEY_RETIRED'])(
    'says Ghost couldn’t confirm the app for %s',
    (code) => {
      expect(sessionFailureOf(apiError(409, code))).toEqual({ code, unconfirmed: true });
    },
  );

  it('leaves other failures alone', () => {
    expect(sessionFailureOf(apiError(409, null))).toBeUndefined();
    expect(sessionFailureOf(apiError(404, 'APP_NOT_INSTALLED'))).toBeUndefined();
    expect(sessionFailureOf(new Error('offline'))).toBeUndefined();
  });
});
