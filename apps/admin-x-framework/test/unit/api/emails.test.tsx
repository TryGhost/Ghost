import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, renderHookWithProviders } from '../../../src/test/test-utils';
import { useRetryEmail } from '../../../src/api/emails';
import { postsDataType } from '../../../src/api/posts';
import { withMockFetch } from '../../utils/mock-fetch';

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
