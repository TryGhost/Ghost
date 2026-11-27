import { test as baseTest, describe, expect, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { newsletterBasicStat, newsletterClickStat, post, type Post } from '@tryghost/test-data';
import { focusManager, type QueryClient } from '@tanstack/react-query';
import type { SetupServer } from 'msw/node';
import { serverFixture } from '@test-utils/fixtures/msw';
import {
  queryClientFixtures,
  TestWrapper,
  type TestWrapperComponent,
} from '@test-utils/fixtures/query-client';
import { usePostNewsletterStats } from '@/posts/analytics/hooks/use-post-newsletter-stats';

import { MemoryRouter, Route, Routes } from 'react-router';
import PostAnalyticsProvider from '@/posts/analytics/providers/post-analytics-provider';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { useEmailTrackClicks } from '@tryghost/admin-x-framework/api/settings';

const newsletterVisibility = vi.hoisted(() => ({ isNewsletterDataHidden: false }));

vi.mock('@/posts/analytics/email-sending-status/email-sending-status-context', () => ({
  useEmailSendingStatusContext: () => newsletterVisibility,
}));
vi.mock('@tryghost/admin-x-framework/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/api/settings')>()),
  useEmailTrackClicks: vi.fn(() => true),
}));

const POSTS_API_URL = '/ghost/api/admin/posts/*';
const NEWSLETTER_BASIC_STATS_API_URL = '/ghost/api/admin/stats/newsletter-basic-stats/';
const NEWSLETTER_CLICK_STATS_API_URL = '/ghost/api/admin/stats/newsletter-click-stats/';
const LINKS_API_URL = '/ghost/api/admin/links/';

const testPostId = 'test-post-id';

// The hook only fetches newsletter stats for posts sent to a newsletter.
const buildPost = (
  overrides: Omit<Partial<Post>, 'email'> & {
    email?: Post['email'] & { submitted_at?: string };
  } = {},
) => post({ id: testPostId, newsletter: { id: 'newsletter-123' }, ...overrides });

const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
  wrapper: async ({ queryClient }, provide) => {
    const wrapper: TestWrapperComponent = ({ children }) => (
      <TestWrapper queryClient={queryClient}>
        <MemoryRouter initialEntries={['/test-post-id']}>
          <Routes>
            <Route
              element={<PostAnalyticsProvider>{children}</PostAnalyticsProvider>}
              path="/:postId"
            />
          </Routes>
        </MemoryRouter>
      </TestWrapper>
    );
    await provide(wrapper);
  },
});

test.beforeEach(({ server }) => {
  vi.mocked(useEmailTrackClicks).mockReturnValue(true);
  newsletterVisibility.isNewsletterDataHidden = false;
  server.use(
    http.get('/ghost/api/admin/users/me/', () =>
      HttpResponse.json({ users: [{ id: 'owner', roles: [{ name: 'Owner' }] }] }),
    ),
    http.get(NEWSLETTER_BASIC_STATS_API_URL, () => HttpResponse.json({ stats: [] })),
    http.get(NEWSLETTER_CLICK_STATS_API_URL, () => HttpResponse.json({ stats: [] })),
    http.get(LINKS_API_URL, () => HttpResponse.json({ links: [] })),
  );
});

describe('usePostNewsletterStats', () => {
  test('calculates stats correctly from post email data', async ({ server, wrapper }) => {
    const postWithEmailStats = buildPost({
      email: {
        email_count: 1000,
        opened_count: 300,
      },
      count: {
        clicks: 50,
        positive_feedback: 0,
        negative_feedback: 0,
      },
    });

    server.use(http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [postWithEmailStats] })));

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        sent: 1000,
        opened: 300,
        clicked: 50,
        openedRate: 0.3, // 300/1000
        clickedRate: 0.05, // 50/1000
      });
    });
  });

  test('returns zero stats when post has no email data', async ({ server, wrapper }) => {
    // No email or count data
    const postWithoutEmail = buildPost();

    server.use(http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [postWithoutEmail] })));

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        sent: 0,
        opened: 0,
        clicked: 0,
        openedRate: 0,
        clickedRate: 0,
      });
    });
  });

  test('calculates average newsletter performance correctly', async ({ server, wrapper }) => {
    const newsletterBasicStats = newsletterBasicStat.many([
      { post_id: 'post1', send_date: '2024-01-01T00:00:00.000Z', open_rate: 0.25 },
      { post_id: 'post2', send_date: '2024-01-02T00:00:00.000Z', open_rate: 0.35 },
      { post_id: 'post3', send_date: '2024-01-03T00:00:00.000Z', open_rate: 0.3 },
    ]);
    const newsletterClickStats = newsletterClickStat.many([
      { post_id: 'post1', click_rate: 0.03 },
      { post_id: 'post2', click_rate: 0.07 },
      { post_id: 'post3', click_rate: 0.05 },
    ]);

    server.use(
      http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [buildPost()] })),
      http.get(NEWSLETTER_BASIC_STATS_API_URL, () =>
        HttpResponse.json({ stats: newsletterBasicStats }),
      ),
      http.get(NEWSLETTER_CLICK_STATS_API_URL, () =>
        HttpResponse.json({ stats: newsletterClickStats }),
      ),
    );

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      // Average: (0.25 + 0.35 + 0.30) / 3 = 0.30
      // Average: (0.03 + 0.07 + 0.05) / 3 = 0.05
      expect(result.current.averageStats).toEqual({
        openedRate: 0.3,
        clickedRate: 0.05,
      });
    });
  });

  test('prevents division by zero in rate calculations', async ({ server, wrapper }) => {
    const postWithClicksButNoEmails = buildPost({
      email: {
        email_count: 0,
        opened_count: 5, // Impossible but testing edge case
      },
      count: {
        clicks: 10,
        positive_feedback: 0,
        negative_feedback: 0,
      },
    });

    server.use(
      http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [postWithClicksButNoEmails] })),
    );

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats.openedRate).toBe(0);
      expect(result.current.stats.clickedRate).toBe(0);
      expect(Number.isNaN(result.current.stats.openedRate)).toBe(false);
      expect(Number.isNaN(result.current.stats.clickedRate)).toBe(false);
    });
  });

  test('handles missing newsletter comparison data gracefully', async ({ server, wrapper }) => {
    server.use(
      http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [buildPost()] })),
      http.get(NEWSLETTER_BASIC_STATS_API_URL, () => HttpResponse.json({ stats: [] })),
      http.get(NEWSLETTER_CLICK_STATS_API_URL, () => HttpResponse.json({ stats: [] })),
    );

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.averageStats).toEqual({
        openedRate: 0,
        clickedRate: 0,
      });
    });
  });

  test('provides top performing links sorted by click count', async ({ server, wrapper }) => {
    const linksData = [
      {
        post_id: testPostId,
        link: { link_id: 'link1', to: 'https://popular.com', from: 'post', edited: false },
        count: { clicks: 25 },
      },
      {
        post_id: testPostId,
        link: { link_id: 'link2', to: 'https://www.another.com', from: 'post', edited: false },
        count: { clicks: 15 },
      },
    ];

    server.use(
      http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [buildPost()] })),
      http.get(LINKS_API_URL, () => HttpResponse.json({ links: linksData })),
    );

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      // Should be sorted by click count (highest first) and URLs cleaned
      expect(result.current.topLinks).toHaveLength(2);
      expect(result.current.topLinks[0].count).toBe(25);
      expect(result.current.topLinks[1].count).toBe(15);

      // Verify URL cleaning and display formatting happens
      expect(result.current.topLinks[0].link.title).toBe('popular.com');
      expect(result.current.topLinks[1].link.title).toBe('another.com');
    });
  });

  test('calculates precise rates with fractional results', async ({ server, wrapper }) => {
    const postWithPrecisionChallenge = buildPost({
      email: {
        email_count: 7,
        opened_count: 2,
      },
      count: {
        clicks: 1,
        positive_feedback: 0,
        negative_feedback: 0,
      },
    });

    server.use(
      http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [postWithPrecisionChallenge] })),
    );

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      // 2/7 = 0.2857142857142857... (JavaScript precision)
      expect(result.current.stats.openedRate).toBeCloseTo(2 / 7, 10);
      // 1/7 = 0.14285714285714285... (JavaScript precision)
      expect(result.current.stats.clickedRate).toBeCloseTo(1 / 7, 10);

      // Ensure calculations return valid numbers (not NaN or Infinity)
      expect(Number.isFinite(result.current.stats.openedRate)).toBe(true);
      expect(Number.isFinite(result.current.stats.clickedRate)).toBe(true);
    });
  });

  test('handles enterprise scale numbers correctly', async ({ server, wrapper }) => {
    const enterprisePost = buildPost({
      email: {
        email_count: 1000000,
        opened_count: 250000,
      },
      count: {
        clicks: 12500,
        positive_feedback: 0,
        negative_feedback: 0,
      },
    });

    server.use(http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [enterprisePost] })));

    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        sent: 1000000,
        opened: 250000,
        clicked: 12500,
        openedRate: 0.25, // 250000/1000000
        clickedRate: 0.0125, // 12500/1000000
      });

      // Ensure calculations maintain precision at scale
      expect(Number.isFinite(result.current.stats.openedRate)).toBe(true);
      expect(Number.isFinite(result.current.stats.clickedRate)).toBe(true);
    });
  });
});

describe('link visibility', () => {
  test.for([
    { reason: 'tracking disabled', trackingEnabled: false, statsHidden: false },
    { reason: 'tracking unresolved', trackingEnabled: undefined, statsHidden: false },
    { reason: 'stats hidden', trackingEnabled: true, statsHidden: true },
  ])(
    'does not fetch links with $reason',
    async ({ trackingEnabled, statsHidden }, { server, wrapper }) => {
      vi.mocked(useEmailTrackClicks).mockReturnValue(trackingEnabled);
      newsletterVisibility.isNewsletterDataHidden = statsHidden;
      const fetchLinks = vi.fn(() => HttpResponse.json({ links: [] }));
      server.use(
        http.get(POSTS_API_URL, () => HttpResponse.json({ posts: [buildPost()] })),
        http.get(LINKS_API_URL, fetchLinks),
      );

      const { result, rerender } = renderHook(() => usePostNewsletterStats(), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fetchLinks).not.toHaveBeenCalled();

      vi.mocked(useEmailTrackClicks).mockReturnValue(true);
      newsletterVisibility.isNewsletterDataHidden = false;
      rerender();

      await waitFor(() => expect(fetchLinks).toHaveBeenCalledOnce());
    },
  );
});

describe('newsletter polling', () => {
  let requests = 0;

  test.beforeEach(({ server }) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    focusManager.setFocused(true);
    requests = 0;

    // Each successful response advances all engagement counts together.
    server.use(
      http.get(POSTS_API_URL, () => {
        requests += 1;
        const updatedPost = buildPost({
          email: {
            email_count: 10,
            opened_count: requests,
            submitted_at: new Date().toISOString(),
          },
          count: { clicks: requests, positive_feedback: requests, negative_feedback: 1 },
        });
        return HttpResponse.json({ posts: [updatedPost] });
      }),
    );
  });

  test.afterEach(() => {
    cleanup();
    focusManager.setFocused(undefined);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('refreshes stats from the shared post query', async ({ wrapper }) => {
    const { result } = renderHook(
      () => ({
        newsletter: usePostNewsletterStats(),
        post: usePostAnalytics().post,
      }),
      { wrapper },
    );

    await vi.waitFor(() => expect(result.current.newsletter.stats.clicked).toBe(1));
    expect(requests).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(5000));

    await vi.waitFor(() => expect(result.current.newsletter.stats.clicked).toBe(2));
    expect(result.current.post?.count?.positive_feedback).toBe(2);
    expect(requests).toBe(2);
  });

  test('pauses while unfocused and stops when unmounted', async ({ wrapper }) => {
    const { result, unmount } = renderHook(() => usePostNewsletterStats(), { wrapper });
    await vi.waitFor(() => expect(result.current.stats.opened).toBe(1));

    act(() => focusManager.setFocused(false));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(requests).toBe(1);

    unmount();
    act(() => focusManager.setFocused(true));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(requests).toBe(1);
  });

  test('keeps cached stats after a failed poll and recovers on the next interval', async ({
    server,
    wrapper,
  }) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePostNewsletterStats(), { wrapper });
    await vi.waitFor(() => expect(result.current.stats.opened).toBe(1));

    server.use(
      http.get(
        POSTS_API_URL,
        () => {
          requests += 1;
          return HttpResponse.json({ errors: [{ message: 'Temporary failure' }] }, { status: 500 });
        },
        { once: true },
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(5000));
    await vi.waitFor(() => expect(requests).toBe(2));
    expect(result.current.stats.opened).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(5000));
    await vi.waitFor(() => expect(result.current.stats.opened).toBe(3));
  });

  test('pauses link polling while requested', async ({ server, wrapper }) => {
    const fetchLinks = vi.fn(() => HttpResponse.json({ links: [] }));
    server.use(http.get(LINKS_API_URL, fetchLinks));

    const { rerender } = renderHook(
      ({ pauseLinkPolling }) => usePostNewsletterStats({ pauseLinkPolling }),
      { wrapper, initialProps: { pauseLinkPolling: false } },
    );
    await vi.waitFor(() => expect(fetchLinks).toHaveBeenCalledOnce());

    rerender({ pauseLinkPolling: true });
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(fetchLinks).toHaveBeenCalledOnce();

    rerender({ pauseLinkPolling: false });
    await act(() => vi.advanceTimersByTimeAsync(5000));
    await vi.waitFor(() => expect(fetchLinks).toHaveBeenCalledTimes(2));
  });
});
