import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  isTwoFactorRequiredError,
  useAddSession,
  useDeleteSession,
  useVerifySession,
} from '../../../src/api/session';
import { JSONError, SessionExpiredError, UnauthorizedError } from '../../../src/utils/errors';
import { withMockFetch } from '../../utils/mock-fetch';

const twoFactorRequiredResponse = {
  errors: [
    {
      code: '2FA_TOKEN_REQUIRED',
      context:
        'A 6-digit sign-in verification code has been sent to your email to keep your account safe.',
      details: null,
      ghostErrorCode: null,
      help: null,
      id: 'session-error-id',
      message: 'User must verify session to login.',
      property: null,
      type: 'Needs2FAError',
    },
  ],
};

describe('session api', () => {
  it('signs in via POST with the username/password body and resolves the 201', async () => {
    await withMockFetch(
      { status: 201, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      async (mock) => {
        const { result } = renderHookWithProviders(() => useAddSession());

        await act(async () => {
          await expect(
            result.current.mutateAsync({ username: 'owner@example.com', password: 'hunter22' }),
          ).resolves.not.toThrow();
        });

        expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/session/');
        expect(mock.calls[0][1].method).toBe('POST');
        expect(mock.calls[0][1].credentials).toBe('include');
        expect(mock.calls[0][1].headers['content-type']).toBe('application/json');
        expect(JSON.parse(mock.calls[0][1].body)).toEqual({
          username: 'owner@example.com',
          password: 'hunter22',
        });
      },
    );
  });

  it('surfaces the 403 two-factor response as a detectable JSONError', async () => {
    await withMockFetch(
      {
        json: twoFactorRequiredResponse,
        headers: { 'content-type': 'application/json' },
        ok: false,
        status: 403,
      },
      async () => {
        const { result } = renderHookWithProviders(() => useAddSession());

        let error: unknown;
        await act(async () => {
          try {
            await result.current.mutateAsync({ username: 'owner@example.com', password: 'x' });
          } catch (caught) {
            error = caught;
          }
        });

        expect(error).toBeInstanceOf(JSONError);
        expect(isTwoFactorRequiredError(error)).toBe(true);
      },
    );
  });

  it('does not treat a wrong password (401) as a two-factor prompt or a session expiry', async () => {
    await withMockFetch({ status: 401, ok: false }, async () => {
      const { result } = renderHookWithProviders(() => useAddSession());

      let error: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync({ username: 'owner@example.com', password: 'x' });
        } catch (caught) {
          error = caught;
        }
      });

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).not.toBeInstanceOf(SessionExpiredError);
      expect(isTwoFactorRequiredError(error)).toBe(false);
    });
  });

  it('verifies via PUT with the token body and resolves the 200', async () => {
    await withMockFetch(
      { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      async (mock) => {
        const { result } = renderHookWithProviders(() => useVerifySession());

        await act(async () => {
          await expect(result.current.mutateAsync({ token: '123456' })).resolves.not.toThrow();
        });

        expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/session/verify/');
        expect(mock.calls[0][1].method).toBe('PUT');
        expect(mock.calls[0][1].credentials).toBe('include');
        expect(JSON.parse(mock.calls[0][1].body)).toEqual({ token: '123456' });
      },
    );
  });

  it('rejects a wrong verification code (bare 401) without redirecting as a session expiry', async () => {
    await withMockFetch({ status: 401, ok: false }, async () => {
      const { result } = renderHookWithProviders(() => useVerifySession());

      let error: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync({ token: '000000' });
        } catch (caught) {
          error = caught;
        }
      });

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).not.toBeInstanceOf(SessionExpiredError);
    });
  });

  it('signs out via DELETE and resolves the 204 with no data', async () => {
    await withMockFetch({ status: 204 }, async (mock) => {
      const { result } = renderHookWithProviders(() => useDeleteSession());

      let response: unknown = 'unset';
      await act(async () => {
        response = await result.current.mutateAsync(null);
      });

      expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/session/');
      expect(mock.calls[0][1].method).toBe('DELETE');
      expect(mock.calls[0][1].credentials).toBe('include');
      expect(response).toBeUndefined();
    });
  });
});
