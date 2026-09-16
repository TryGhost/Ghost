import { test as baseTest, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { focusManager, type QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { SetupServer } from 'msw/node';
import { post } from '@tryghost/test-data';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { serverFixture } from '@test-utils/fixtures/msw';
import { POST_ANALYTICS_INCLUDE } from '@/shared/analytics/constants';
import { usePostStatsPolling } from '@/posts/analytics/hooks/use-post-stats-polling';

const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({ ...serverFixture, ...queryClientFixtures });

test('shares the provider query and polls only while the stats consumer is focused and mounted', async ({
  server,
  wrapper,
}) => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  focusManager.setFocused(true);
  server.use(
    http.get('/ghost/api/admin/users/me/', () =>
      HttpResponse.json({ users: [{ id: 'user-id', roles: [{ name: 'Owner' }] }] }),
    ),
  );
  let requests = 0;
  const testPost = {
    ...post({ id: 'post-id' }),
    email: { email_count: 10, opened_count: 0, submitted_at: new Date().toISOString() },
  };
  server.use(
    http.get('/ghost/api/admin/posts/*', () => {
      requests += 1;
      return HttpResponse.json({ posts: [{ ...testPost, count: { clicks: requests } }] });
    }),
  );
  const provider = renderHook(
    () =>
      useBrowsePosts({
        searchParams: { filter: 'id:post-id', include: POST_ANALYTICS_INCLUDE },
        staleTime: Infinity,
      }),
    { wrapper },
  );
  const consumer = renderHook(() => usePostStatsPolling('post-id'), { wrapper });
  try {
    await vi.waitFor(() => expect(consumer.result.current.data?.posts[0]?.count?.clicks).toBe(1));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    await vi.waitFor(() => expect(provider.result.current.data?.posts[0]?.count?.clicks).toBe(2));
    expect(requests).toBe(2);

    act(() => focusManager.setFocused(false));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(requests).toBe(2);

    consumer.unmount();
    act(() => focusManager.setFocused(true));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(requests).toBe(2);
  } finally {
    consumer.unmount();
    provider.unmount();
    focusManager.setFocused(undefined);
    vi.useRealTimers();
  }
});

test('stops polling after a refresh fails', async ({ server, wrapper }) => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  focusManager.setFocused(true);
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  server.use(
    http.get('/ghost/api/admin/users/me/', () =>
      HttpResponse.json({ users: [{ id: 'user-id', roles: [{ name: 'Owner' }] }] }),
    ),
  );
  let requests = 0;
  server.use(
    http.get('/ghost/api/admin/posts/*', () => {
      requests += 1;
      return requests === 1
        ? HttpResponse.json({
            posts: [
              {
                ...post(),
                email: { email_count: 10, opened_count: 0, submitted_at: new Date().toISOString() },
              },
            ],
          })
        : HttpResponse.json({ errors: [{ message: 'Temporary failure' }] }, { status: 500 });
    }),
  );
  const consumer = renderHook(() => usePostStatsPolling('post-id'), { wrapper });
  try {
    await vi.waitFor(() => expect(consumer.result.current.isSuccess).toBe(true));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    await vi.waitFor(() => expect(consumer.result.current.isError).toBe(true));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(requests).toBe(2);
    expect(consumer.result.current.data?.posts[0]?.email).toBeDefined();
  } finally {
    consumer.unmount();
    focusManager.setFocused(undefined);
    vi.useRealTimers();
    consoleError.mockRestore();
  }
});
