import { describe, expect, it, vi } from 'vitest';
import {
  type ErrorResponse,
  JSONError,
  SessionExpiredError,
} from '@tryghost/admin-x-framework/errors';
import type { Config } from '@tryghost/admin-x-framework/api/config';
import {
  AppsTurnedOffError,
  endsAppSession,
  failureOfResponse,
  isRefusedToken,
  refusesStaffUser,
  sessionFailureOf,
  sessionStartFailure,
  siteBlocksApps,
} from './app-failure';

const apiError = (status: number, code: string | null, type?: string) =>
  new JSONError(new Response(null, { status }), {
    errors: [{ code, type, message: 'Refused' }],
  } as unknown as ErrorResponse);

describe('sessionFailureOf', () => {
  it('reads a failure of the app, with its own code', () => {
    expect(sessionFailureOf(apiError(409, 'APP_MANIFEST_UNREACHABLE'))).toEqual({
      code: 'APP_MANIFEST_UNREACHABLE',
      unconfirmed: false,
    });
  });

  it.each(['APP_IDENTITY_MISMATCH', 'APP_CHALLENGE_FAILED', 'APP_BACKEND_KEY_RETIRED'])(
    'says Ghost couldn’t confirm the app for %s',
    (code) => {
      expect(sessionFailureOf(apiError(409, code))).toEqual({ code, unconfirmed: true });
    },
  );

  it('leaves other failures alone', () => {
    expect(sessionFailureOf(apiError(409, null))).toBeUndefined();
    expect(sessionFailureOf(apiError(409, 'SOME_OTHER_CONFLICT'))).toBeUndefined();
    expect(sessionFailureOf(apiError(404, 'APP_NOT_INSTALLED'))).toBeUndefined();
    expect(sessionFailureOf(apiError(409, 'APP_TOKENS_UNAVAILABLE'))).toBeUndefined();
    expect(sessionFailureOf(new Error('offline'))).toBeUndefined();
  });
});

describe('siteBlocksApps', () => {
  it('reads the codes that keep every app from opening on the site', () => {
    expect(siteBlocksApps(apiError(409, 'APP_AUTH_ENGINE_UNSUPPORTED'))).toBe('new-auth-engine');
    expect(siteBlocksApps(apiError(409, 'APP_TOKENS_UNAVAILABLE'))).toBe('restart');
    expect(siteBlocksApps(apiError(409, 'APP_SESSION_ENDED'))).toBeUndefined();
  });

  it('reads apps as turned off only once the site’s config shows it', () => {
    expect(siteBlocksApps(new AppsTurnedOffError())).toBe('off');
    expect(siteBlocksApps(apiError(404, null, 'NotFoundError'))).toBeUndefined();
  });
});

const withLabs = (labs: unknown) => ({ labs }) as Config;

describe('sessionStartFailure', () => {
  const uncodedNotFound = apiError(404, null, 'NotFoundError');

  it('reads a 404 without a code as apps turned off when the site’s config, read again, shows it', async () => {
    for (const labs of [{ apps: false }, {}, { apps: 'true' }]) {
      const readConfig = vi.fn(() => Promise.resolve(withLabs(labs)));

      const failure = await sessionStartFailure(uncodedNotFound, readConfig);

      expect(failure).toBeInstanceOf(AppsTurnedOffError);
      expect((failure as Error).cause).toBe(uncodedNotFound);
      expect(readConfig).toHaveBeenCalledOnce();
    }
  });

  it('keeps a 404 without a code as it is while the config shows apps on, or can’t say', async () => {
    for (const readConfig of [
      () => Promise.resolve(withLabs({ apps: true })),
      () => Promise.resolve(withLabs(undefined)),
      () => Promise.resolve(undefined),
      () => Promise.reject(new Error('offline')),
    ]) {
      expect(await sessionStartFailure(uncodedNotFound, readConfig)).toBe(uncodedNotFound);
    }
  });

  it('reads no config for any other failure', async () => {
    const readConfig = vi.fn(() => Promise.resolve(withLabs({ apps: false })));
    const notInstalled = apiError(404, 'APP_NOT_INSTALLED', 'NotFoundError');

    expect(await sessionStartFailure(notInstalled, readConfig)).toBe(notInstalled);
    expect(readConfig).not.toHaveBeenCalled();
  });
});

describe('refusesStaffUser', () => {
  it('reads a staff user Ghost won’t open apps for', () => {
    expect(refusesStaffUser(apiError(403, 'APP_STAFF_SESSION_REQUIRED', 'NoPermissionError'))).toBe(
      true,
    );
    // The Admin API's permission check, for a user whose role can't read installations
    expect(refusesStaffUser(apiError(403, null, 'NoPermissionError'))).toBe(true);
    expect(refusesStaffUser(apiError(409, 'APP_SESSION_ENDED'))).toBe(false);
  });

  it('leaves an expired staff session to Admin’s sign-in handling', () => {
    const expired = new SessionExpiredError(new Response(null, { status: 403 }), {
      errors: [{ type: 'NoPermissionError', message: 'Authorization failed' }],
    });
    expect(refusesStaffUser(expired)).toBe(false);
  });
});

describe('endsAppSession', () => {
  it('ends a session on the codes that refuse it for good, or a permission refusal', () => {
    expect(endsAppSession(apiError(409, 'APP_SESSION_ENDED'))).toBe(true);
    expect(endsAppSession(apiError(404, 'APP_NOT_INSTALLED'))).toBe(true);
    expect(endsAppSession(apiError(403, null, 'NoPermissionError'))).toBe(true);
    // Apps may have been turned off; the session start that follows finds out
    expect(endsAppSession(apiError(404, null, 'NotFoundError'))).toBe(true);
  });

  it('keeps it for anything else with the same status', () => {
    expect(endsAppSession(apiError(409, 'SOME_OTHER_CONFLICT'))).toBe(false);
    expect(endsAppSession(apiError(500, null, 'InternalServerError'))).toBe(false);
    expect(endsAppSession(new Error('offline'))).toBe(false);
  });

  it.each([
    ['no body', null],
    ['a body that isn’t an object', 'Not Found'],
    ['no errors', {}],
    ['errors that aren’t a list', { errors: { code: 'APP_SESSION_ENDED' } }],
    ['an empty list of errors', { errors: [] }],
    ['an error that isn’t an object', { errors: ['APP_SESSION_ENDED'] }],
    ['a code that isn’t text', { errors: [{ code: 404, type: 'NotFoundError' }] }],
    ['a type that isn’t text', { errors: [{ code: 'APP_SESSION_ENDED', type: 409 }] }],
  ])('keeps it for a failure with %s', (_, body) => {
    const failure = new JSONError(new Response(null, { status: 404 }), body as ErrorResponse);
    expect(endsAppSession(failure)).toBe(false);
  });
});

describe('isRefusedToken', () => {
  it('reads a refused app token from a response Admin sent for an app', async () => {
    const refused = new Response('{"errors":[{"code":"APP_TOKEN_INVALID"}]}', { status: 401 });
    const other = new Response('{"errors":[{"code":"NO_PERMISSION"}]}', { status: 401 });

    expect(isRefusedToken(await failureOfResponse(refused))).toBe(true);
    expect(isRefusedToken(await failureOfResponse(other))).toBe(false);
    for (const body of [
      'not json',
      '"APP_TOKEN_INVALID"',
      '{"errors":"APP_TOKEN_INVALID"}',
      '{"errors":[{"code":["APP_TOKEN_INVALID"]}]}',
    ]) {
      expect(isRefusedToken(await failureOfResponse(new Response(body, { status: 401 })))).toBe(
        false,
      );
    }
    // The response can still be read
    expect(await refused.json()).toEqual({ errors: [{ code: 'APP_TOKEN_INVALID' }] });
  });
});
