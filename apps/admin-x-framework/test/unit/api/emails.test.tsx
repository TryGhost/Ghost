import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, renderHookWithProviders } from '../../../src/test/test-utils';
import { useEmailSendingStatus, useRetryEmail } from '../../../src/api/emails';
import { postsDataType } from '../../../src/api/posts';
import { withMockFetch } from '../../utils/mock-fetch';

describe('emails api', () => {
  it('reads an email sending status via the status endpoint', async () => {
    await withMockFetch(
      {
        json: {
          users: [{ id: 'user-1', roles: [] }],
          email_statuses: [
            {
              id: 'email-1',
              sending: {
                status: 'submitting',
                progress: {
                  completed: 500,
                  total: 1000,
                  estimated_seconds_remaining: 30,
                },
              },
            },
          ],
        },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() => useEmailSendingStatus('email-1'));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const statusRequest = mock.calls.find(([url]) =>
          String(url).includes('/emails/email-1/status/'),
        );
        expect(statusRequest).toBeDefined();
        const [url, options] = statusRequest!;
        expect(new URL(url as string).pathname).toBe('/ghost/api/admin/emails/email-1/status/');
        expect(options.method).toBe('GET');
        expect(result.current.data?.email_statuses[0]?.sending).toEqual({
          status: 'submitting',
          progress: {
            completed: 500,
            total: 1000,
            estimated_seconds_remaining: 30,
          },
        });
      },
    );
  });

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
          response = await result.current.mutateAsync('email-1');
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
          await result.current.mutateAsync('email-1');
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [postsDataType] });
        expect(onInvalidate).toHaveBeenCalledWith(postsDataType);
      },
    );
  });
});
