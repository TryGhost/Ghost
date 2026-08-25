import { test as baseTest, describe, expect } from 'vitest';
import { HttpResponse, http } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { newsletterBasicStat, newsletterClickStat, post, type Post } from '@tryghost/test-data';
import type { QueryClient } from '@tanstack/react-query';
import type { SetupServer } from 'msw/node';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { usePostNewsletterStats } from '@/posts/analytics/hooks/use-post-newsletter-stats';

const POSTS_API_URL = '/ghost/api/admin/posts/*';
const NEWSLETTER_BASIC_STATS_API_URL = '/ghost/api/admin/stats/newsletter-basic-stats/';
const NEWSLETTER_CLICK_STATS_API_URL = '/ghost/api/admin/stats/newsletter-click-stats/';
const LINKS_API_URL = '/ghost/api/admin/links/';

const testPostId = 'test-post-id';

// The hook only fetches newsletter stats for posts sent to a newsletter.
const buildPost = (overrides: Partial<Post> = {}) =>
  post({ id: testPostId, newsletter: { id: 'newsletter-123' }, ...overrides });

const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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

    const { result } = renderHook(() => usePostNewsletterStats(testPostId), { wrapper });

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
