import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAcceptInvitation,
  useCompletePasswordReset,
  useCompleteSetup,
  useInvitationStatus,
  useRequestPasswordReset,
  useSetupStatus,
} from '../../../src/api/authentication';
import { UnauthorizedError } from '../../../src/utils/errors';
import { withMockFetch } from '../../utils/mock-fetch';

const json = { 'content-type': 'application/json' };

const requestedUrls = (mock: { calls: unknown[][] }) => mock.calls.map(([url]) => String(url));

describe('authentication api', () => {
  it('reads the setup status', async () => {
    await withMockFetch({ json: { setup: [{ status: true }] }, headers: json }, async (mock) => {
      const { result } = renderHookWithProviders(() => useSetupStatus());

      await waitFor(() => expect(result.current.data).toEqual({ setup: [{ status: true }] }));
      expect(requestedUrls(mock)).toContain(
        'http://localhost:3000/ghost/api/admin/authentication/setup/',
      );
    });
  });

  it('checks an invitation by email', async () => {
    await withMockFetch(
      { json: { invitation: [{ valid: true }] }, headers: json },
      async (mock) => {
        const { result } = renderHookWithProviders(() =>
          useInvitationStatus({ searchParams: { email: 'staff@example.com' } }),
        );

        await waitFor(() => expect(result.current.data?.invitation?.[0].valid).toBe(true));
        expect(requestedUrls(mock)).toContain(
          'http://localhost:3000/ghost/api/admin/authentication/invitation/?email=staff%40example.com',
        );
      },
    );
  });

  it.each([
    [
      'requests a password reset',
      () => useRequestPasswordReset(),
      { email: 'owner@example.com' },
      'POST',
      '/authentication/password_reset/',
      { password_reset: [{ email: 'owner@example.com' }] },
    ],
    [
      'completes a password reset',
      () => useCompletePasswordReset(),
      { token: 'dG9rZW4', newPassword: 'a-long-password', ne2Password: 'a-long-password' },
      'PUT',
      '/authentication/password_reset/',
      {
        password_reset: [
          { token: 'dG9rZW4', newPassword: 'a-long-password', ne2Password: 'a-long-password' },
        ],
      },
    ],
    [
      'accepts an invitation',
      () => useAcceptInvitation(),
      { token: 'dG9rZW4', name: 'Jamie', email: 'staff@example.com', password: 'a-long-password' },
      'POST',
      '/authentication/invitation/',
      {
        invitation: [
          {
            token: 'dG9rZW4',
            name: 'Jamie',
            email: 'staff@example.com',
            password: 'a-long-password',
          },
        ],
      },
    ],
    [
      'completes setup',
      () => useCompleteSetup(),
      { name: 'Jamie', email: 'owner@example.com', password: 'a-long-password', blogTitle: 'Blog' },
      'POST',
      '/authentication/setup/',
      {
        setup: [
          {
            name: 'Jamie',
            email: 'owner@example.com',
            password: 'a-long-password',
            blogTitle: 'Blog',
          },
        ],
      },
    ],
  ])('%s', async (_name, useHook, payload, method, path, body) => {
    await withMockFetch({ json: {}, headers: json }, async (mock) => {
      const { result } = renderHookWithProviders(
        useHook as () => { mutateAsync: (value: object) => Promise<unknown> },
      );

      await act(async () => {
        await result.current.mutateAsync(payload);
      });

      expect(mock.calls[0][0]).toBe(`http://localhost:3000/ghost/api/admin${path}`);
      expect(mock.calls[0][1].method).toBe(method);
      expect(JSON.parse(mock.calls[0][1].body)).toEqual(body);
    });
  });

  it('keeps the error body of a rejected reset link', async () => {
    await withMockFetch(
      {
        json: {
          errors: [{ message: 'Cannot reset password.', context: 'Invalid password reset link.' }],
        },
        headers: json,
        ok: false,
        status: 401,
      },
      async () => {
        const { result } = renderHookWithProviders(() => useCompletePasswordReset());

        let error: unknown;
        await act(async () => {
          try {
            await result.current.mutateAsync({ token: 'bad', newPassword: 'x', ne2Password: 'x' });
          } catch (caught) {
            error = caught;
          }
        });

        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).data).toEqual({
          errors: [{ message: 'Cannot reset password.', context: 'Invalid password reset link.' }],
        });
      },
    );
  });
});
