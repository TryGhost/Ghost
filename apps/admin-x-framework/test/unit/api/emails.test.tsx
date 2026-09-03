import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useBrowseEmailBatches,
  useEmailSendingStatus,
  useRetryEmail,
} from '../../../src/api/emails';
import { postsDataType } from '../../../src/api/posts';
import { withMockFetch } from '../../utils/mock-fetch';

describe('emails api', () => {
  it('reads filtered email batches via the batches endpoint', async () => {
    await withMockFetch(
      {
        json: { batches: [{ id: 'batch-1', status: 'submitting' }] },
        headers: { 'content-type': 'application/json' },
      },
      async (mock) => {
        const { result } = renderHookWithProviders(() =>
          useBrowseEmailBatches('email-1', {
            searchParams: { filter: 'status:submitting', fields: 'id,status', limit: '1' },
          }),
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const batchRequest = (mock.calls as Array<Parameters<typeof globalThis.fetch>>).find(
          ([url]) => String(url).includes('/emails/email-1/batches/'),
        );
        expect(batchRequest).toBeDefined();
        const [url, options] = batchRequest!;
        const requestUrl = new URL(url as string);
        expect(requestUrl.pathname).toBe('/ghost/api/admin/emails/email-1/batches/');
        expect(requestUrl.searchParams.get('filter')).toBe('status:submitting');
        expect(requestUrl.searchParams.get('fields')).toBe('id,status');
        expect(requestUrl.searchParams.get('limit')).toBe('1');
        expect(options?.method).toBe('GET');
        expect(result.current.data?.batches).toEqual([{ id: 'batch-1', status: 'submitting' }]);
      },
    );
  });

  it('rejects malformed email batch responses', async () => {
    await withMockFetch(
      {
        json: { batches: [{ id: 'batch-1', status: 'unknown' }] },
        headers: { 'content-type': 'application/json' },
      },
      async () => {
        const { result } = renderHookWithProviders(() =>
          useBrowseEmailBatches('email-1', { defaultErrorHandler: false }),
        );

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.data).toBeUndefined();
      },
    );
  });

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

        const statusRequest = (mock.calls as Array<Parameters<typeof globalThis.fetch>>).find(
          ([url]) => String(url).includes('/emails/email-1/status/'),
        );
        expect(statusRequest).toBeDefined();
        const [url, options] = statusRequest!;
        expect(new URL(url as string).pathname).toBe('/ghost/api/admin/emails/email-1/status/');
        expect(options?.method).toBe('GET');
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

  it('rejects malformed email sending status responses', async () => {
    await withMockFetch(
      {
        json: {},
        headers: { 'content-type': 'application/json' },
      },
      async () => {
        const { result } = renderHookWithProviders(() =>
          useEmailSendingStatus('email-1', { defaultErrorHandler: false }),
        );

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.data).toBeUndefined();
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
