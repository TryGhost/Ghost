import { describe, expect, it } from 'vitest';
import { type ErrorResponse, JSONError } from '@tryghost/admin-x-framework/errors';
import {
  endsAppSession,
  failureOfResponse,
  isRefusedToken,
  sessionFailureOf,
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

  it('reads a 404 without a code, how Ghost turns the apps routes away, as apps turned off', () => {
    expect(siteBlocksApps(apiError(404, null, 'NotFoundError'))).toBe('off');
    expect(siteBlocksApps(apiError(404, 'APP_NOT_INSTALLED', 'NotFoundError'))).toBeUndefined();
  });
});

describe('endsAppSession', () => {
  it('ends a session on the codes that refuse it for good, or a permission refusal', () => {
    expect(endsAppSession(apiError(409, 'APP_SESSION_ENDED'))).toBe(true);
    expect(endsAppSession(apiError(404, 'APP_NOT_INSTALLED'))).toBe(true);
    expect(endsAppSession(apiError(403, null, 'NoPermissionError'))).toBe(true);
    // Apps were turned off
    expect(endsAppSession(apiError(404, null, 'NotFoundError'))).toBe(true);
  });

  it('keeps it for anything else with the same status', () => {
    expect(endsAppSession(apiError(409, 'SOME_OTHER_CONFLICT'))).toBe(false);
    expect(endsAppSession(apiError(500, null, 'InternalServerError'))).toBe(false);
    expect(endsAppSession(new Error('offline'))).toBe(false);
  });
});

describe('isRefusedToken', () => {
  it('reads a refused app token from a response Admin sent for an app', async () => {
    const refused = new Response('{"errors":[{"code":"APP_TOKEN_INVALID"}]}', { status: 401 });
    const other = new Response('{"errors":[{"code":"NO_PERMISSION"}]}', { status: 401 });

    expect(isRefusedToken(await failureOfResponse(refused))).toBe(true);
    expect(isRefusedToken(await failureOfResponse(other))).toBe(false);
    expect(isRefusedToken(await failureOfResponse(new Response('not json', { status: 401 })))).toBe(
      false,
    );
    // The response can still be read
    expect(await refused.json()).toEqual({ errors: [{ code: 'APP_TOKEN_INVALID' }] });
  });
});
