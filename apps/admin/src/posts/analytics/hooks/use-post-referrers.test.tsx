import { test as baseTest, describe, expect } from 'vitest';
import { HttpResponse, http } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import {
  browseResponse,
  mrrHistoryStat,
  postGrowthStat,
  postReferrerStat,
  type MrrHistoryStat,
  type PostGrowthStat,
  type PostReferrerStat,
} from '@tryghost/test-data';
import type { QueryClient } from '@tanstack/react-query';
import type { SetupServer } from 'msw/node';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { usePostReferrers } from '@/posts/analytics/hooks/use-post-referrers';

const REFERRERS_API_URL = '/ghost/api/admin/stats/posts/*/top-referrers';
const GROWTH_API_URL = '/ghost/api/admin/stats/posts/*/growth';
const MRR_API_URL = '/ghost/api/admin/stats/mrr/';

const testPostId = '64d623b64676110001e897d9';

interface ReferrerApiData {
  referrers: PostReferrerStat[];
  growth: PostGrowthStat[];
  mrr: { items: MrrHistoryStat[]; totals: Array<{ currency: string; mrr: number }> };
}

const defaultApiData: ReferrerApiData = {
  referrers: postReferrerStat.many([
    {
      source: 'Google',
      referrer_url: 'https://google.com',
      free_members: 120,
      paid_members: 25,
      mrr: 12500,
    },
    {
      source: 'Twitter',
      referrer_url: 'https://twitter.com',
      free_members: 80,
      paid_members: 15,
      mrr: 7500,
    },
    { source: 'Direct', free_members: 50, paid_members: 10, mrr: 5000 },
  ]),
  growth: postGrowthStat.many([
    { post_id: testPostId, free_members: 100, paid_members: 25, mrr: 1250 },
  ]),
  mrr: {
    items: mrrHistoryStat.many([
      { date: '2024-01-01', mrr: 50000, currency: 'usd' },
      { date: '2024-01-02', mrr: 51500, currency: 'usd' },
      { date: '2024-01-03', mrr: 52500, currency: 'usd' },
    ]),
    totals: [{ currency: 'usd', mrr: 55000 }],
  },
};

function mockReferrerApi(server: SetupServer, data: ReferrerApiData = defaultApiData) {
  server.use(
    http.get(REFERRERS_API_URL, () =>
      HttpResponse.json(browseResponse('stats', data.referrers, { limit: 10 })),
    ),
    http.get(GROWTH_API_URL, () => HttpResponse.json(browseResponse('stats', data.growth))),
    http.get(MRR_API_URL, () =>
      HttpResponse.json({ stats: data.mrr.items, meta: { totals: data.mrr.totals } }),
    ),
  );
}

const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
});

describe('usePostReferrers', () => {
  describe('hook functionality', () => {
    test('returns referrer stats when data is available', async ({ server, wrapper }) => {
      mockReferrerApi(server);

      const { result } = renderHook(() => usePostReferrers(testPostId), { wrapper });

      await waitFor(() => {
        expect(result.current.stats).toHaveLength(3);
        expect(result.current.stats[0]).toEqual({
          source: 'Google',
          referrer_url: 'https://google.com',
          free_members: 120,
          paid_members: 25,
          mrr: 12500,
        });
        expect(result.current.totals).toEqual({
          post_id: testPostId,
          free_members: 100,
          paid_members: 25,
          mrr: 1250,
        });
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('returns empty stats when no data available', async ({ server, wrapper }) => {
      mockReferrerApi(server, {
        referrers: [],
        growth: [],
        mrr: { items: [], totals: [] },
      });

      const { result } = renderHook(() => usePostReferrers(testPostId), { wrapper });

      await waitFor(() => {
        expect(result.current.stats).toEqual([]);
        expect(result.current.totals).toEqual({
          free_members: 0,
          paid_members: 0,
          mrr: 0,
        });
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('returns USD currency when MRR history is available', async ({ server, wrapper }) => {
      mockReferrerApi(server);

      const { result } = renderHook(() => usePostReferrers(testPostId), { wrapper });

      await waitFor(() => {
        expect(result.current.selectedCurrency).toBe('usd');
        expect(result.current.currencySymbol).toBe('$');
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('selects currency with highest MRR when multiple currencies available', async ({
      server,
      wrapper,
    }) => {
      mockReferrerApi(server, {
        referrers: [postReferrerStat({ source: 'Google' })],
        growth: [postGrowthStat({ post_id: testPostId })],
        mrr: {
          items: mrrHistoryStat.many([
            { date: '2024-01-01', mrr: 30000, currency: 'usd' },
            { date: '2024-01-01', mrr: 50000, currency: 'eur' },
          ]),
          totals: [
            { currency: 'usd', mrr: 30000 },
            { currency: 'eur', mrr: 50000 },
          ],
        },
      });

      const { result } = renderHook(() => usePostReferrers(testPostId), { wrapper });

      await waitFor(() => {
        expect(result.current.selectedCurrency).toBe('eur');
        expect(result.current.currencySymbol).toBe('€');
      });
    });

    test('defaults to USD when no MRR history available', async ({ server, wrapper }) => {
      mockReferrerApi(server, {
        referrers: [postReferrerStat({ source: 'Google' })],
        growth: [postGrowthStat({ post_id: testPostId })],
        mrr: { items: [], totals: [] },
      });

      const { result } = renderHook(() => usePostReferrers(testPostId), { wrapper });

      await waitFor(() => {
        expect(result.current.selectedCurrency).toBe('usd');
        expect(result.current.currencySymbol).toBe('$');
      });
    });
  });
});
