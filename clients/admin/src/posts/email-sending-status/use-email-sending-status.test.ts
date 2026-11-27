import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEmailSendingStatusPolling } from './use-email-sending-status';
import type { EmailStatusesResponseType } from '@tryghost/admin-x-framework/api/emails';

const { fetchStatus } = vi.hoisted(() => ({ fetchStatus: vi.fn() }));

// Keep the real query observer and production cache lifetime; only replace HTTP.
vi.mock('@tryghost/admin-x-framework/api/emails', () => ({
  useEmailSendingStatus: (id: string, options: object) =>
    useQuery<EmailStatusesResponseType>({
      ...options,
      queryKey: ['email-status', id],
      queryFn: fetchStatus,
    }),
}));

function response(
  status: 'preparing' | 'submitting' | 'submitted' | 'failed',
): EmailStatusesResponseType {
  const progress = { completed: 10, total: 100, estimated_seconds_remaining: null };
  return {
    email_statuses: [
      {
        id: 'email-1',
        sending:
          status === 'failed'
            ? { status, progress, failed_during: 'submitting' }
            : { status, progress },
      },
    ],
  };
}

const clients: QueryClient[] = [];

afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.resetAllMocks();
});

function setup(cached: EmailStatusesResponseType, emailStatus = 'submitting') {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } },
  });
  clients.push(client);
  client.setQueryData(['email-status', 'email-1'], cached);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(
    () =>
      useEmailSendingStatusPolling({
        emailId: 'email-1',
        emailStatus,
        enabled: true,
      }),
    { wrapper },
  );
}

describe('email status on screen entry', () => {
  it('fetches the current retry progress instead of reusing a cached send failure', async () => {
    let resolve!: (value: EmailStatusesResponseType) => void;
    fetchStatus.mockImplementation(
      () =>
        new Promise<EmailStatusesResponseType>((done) => {
          resolve = done;
        }),
    );
    // The list previously observed a failure. After a retry elsewhere, the post
    // says submitting, but the status query still has that failure in its cache.
    const { result, unmount } = setup(response('failed'), 'submitting');

    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    act(() => {
      resolve(response('submitting'));
    });
    await waitFor(() => expect(result.current.status?.sending.status).toBe('submitting'));
    // Failed sends stop polling; the refreshed retry must start it again.
    await waitFor(() => expect(fetchStatus.mock.calls.length).toBeGreaterThan(1));
    unmount();
  });

  it('does not expose the cached failure if the entry refresh fails', async () => {
    fetchStatus.mockRejectedValue(new Error('Bad gateway'));
    const { result, unmount } = setup(response('failed'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBeUndefined();
    unmount();
  });

  it('does not revive cached sending UI for a post already submitted', () => {
    const { result, unmount } = setup(response('failed'), 'submitted');
    expect(fetchStatus).not.toHaveBeenCalled();
    expect(result.current.status).toBeUndefined();
    unmount();
  });

  it('propagates an explicit refresh failure so analytics can report a failed retry', async () => {
    fetchStatus.mockResolvedValue(response('failed'));
    const { result, unmount } = setup(response('failed'), 'failed');
    await waitFor(() => expect(result.current.status?.sending.status).toBe('failed'));

    const error = new Error('Bad gateway');
    fetchStatus.mockRejectedValue(error);
    await act(async () => {
      await expect(result.current.refetch({ throwOnError: true })).rejects.toBe(error);
    });
    unmount();
  });
});
