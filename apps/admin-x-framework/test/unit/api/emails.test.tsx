import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, renderHookWithProviders } from '../../../src/test/test-utils';
import { SessionExpiredError } from '../../../src/utils/errors';
import { useRetryEmail } from '../../../src/api/emails';
import { postsDataType } from '../../../src/api/posts';
import { withMockFetch } from '../../utils/mock-fetch';

const unauthorized = {
  json: { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
  headers: { 'content-type': 'application/json' },
  status: 401,
  ok: false,
};

describe('emails api', () => {
  it('retries a failed email via the retry endpoint', async () => {
    await withMockFetch(
      {
        json: { emails: [{ id: 'email-1', status: 'pending', email_count: 10, opened_count: 0 }] },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() => useRetryEmail());

        let response;
        await act(async () => {
          response = await result.current.mutateAsync({ id: 'email-1' });
        });

        const [url, options] = mock.calls[0];
        expect(new URL(url as string).pathname).toBe('/ghost/api/admin/emails/email-1/retry/');
        expect(options.method).toBe('PUT');
        expect(JSON.parse(options.body as string)).toEqual({});
        expect(response).toEqual({
          emails: [{ id: 'email-1', status: 'pending', email_count: 10, opened_count: 0 }],
        });
      },
    );
  });

  it('invalidates post queries so the embedded email refreshes', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const onInvalidate = vi.fn();

    await withMockFetch(
      {
        json: { emails: [{ id: 'email-1', status: 'pending', email_count: 10, opened_count: 0 }] },
        headers: { 'content-type': 'application/json' },
      },
      async () => {
        const { result } = renderHookWithProviders(() => useRetryEmail(), {
          queryClient,
          frameworkProps: { onInvalidate },
        });

        await act(async () => {
          await result.current.mutateAsync({ id: 'email-1' });
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [postsDataType] });
        expect(onInvalidate).toHaveBeenCalledWith(postsDataType);
      },
    );
  });

  // The redirect fires at most once per page load, so the opt-out case has to
  // run before the case that spends it.
  describe('session expiry', () => {
    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
      delete (window as unknown as { location?: Location }).location;
      (window as unknown as { location: unknown }).location = {
        href: 'http://localhost:3000/ghost/',
        hash: '#/posts',
        origin: 'http://localhost:3000',
        pathname: '/ghost/',
        replace: vi.fn(),
      };
    });

    afterEach(() => {
      (window as unknown as { location: Location }).location = originalLocation;
    });

    it('leaves an expired session to the caller when the payload opts out', async () => {
      await withMockFetch(unauthorized, async () => {
        const { result } = renderHookWithProviders(() => useRetryEmail());

        await act(async () => {
          await expect(
            result.current.mutateAsync({ id: 'email-1', sessionExpiryRedirect: false }),
          ).rejects.toBeInstanceOf(SessionExpiredError);
        });

        expect(window.location.replace).not.toHaveBeenCalled();
      });
    });

    it('redirects on an expired session when the payload omits the flag', async () => {
      await withMockFetch(unauthorized, async () => {
        const { result } = renderHookWithProviders(() => useRetryEmail());

        await act(async () => {
          await expect(result.current.mutateAsync({ id: 'email-1' })).rejects.toBeInstanceOf(
            SessionExpiredError,
          );
        });

        expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
      });
    });
  });
});
