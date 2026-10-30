import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { TestWrapper } from '@test-utils/fixtures/query-client';
import { newsletterBasicStatsDataType, newsletterClickStatsDataType } from '@tryghost/admin-x-framework/api/stats';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { z } from 'zod';
import type { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import {
  fetchNewsletterPeriodClicks,
  fetchNewsletterPeriodStats,
  UnsupportedNewsletterPaginationError,
  useNewsletterPeriodStats,
} from './use-newsletter-period-stats';

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn(), handleError: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFetchApi: () => mocks.fetchApi,
  useHandleError: () => mocks.handleError,
}));

describe('fetchNewsletterPeriodStats', () => {
  it('loads every basic page with bounded sequential requests', async () => {
    const sends = Array.from({ length: 125 }, (_, index) => ({
      post_id: String(index).padStart(24, '0'),
      post_title: `Issue ${index}`,
      send_date: '2026-01-10T12:00:00.000Z',
      sent_to: 100,
      total_opens: index,
      open_rate: index / 125,
    }));
    let active = 0;
    let maxActive = 0;
    const fetchApi = vi.fn(async (input: string | URL) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      const url = new URL(input);
      expect(url.searchParams.get('newsletter_id')).toBe('newsletter-1');
      expect(url.pathname).toContain('newsletter-basic-stats');
      expect(url.searchParams.get('date_from')).toBe('2026-01-01');
      expect(url.searchParams.get('date_to')).toBe('2026-01-31');
      expect(url.searchParams.get('timezone')).toBe('America/Sao_Paulo');
      const page = Number(url.searchParams.get('page'));
      const limit = Number(url.searchParams.get('limit'));
      const afterId = url.searchParams.get('after_id');
      const offset = afterId ? sends.findIndex((send) => send.post_id === afterId) + 1 : 0;
      if (afterId) {
        expect(url.searchParams.get('after_date')).toBe('2026-01-10 12:00:00.000');
      }
      const hasNext = offset + limit < sends.length;
      const response = {
        stats: sends.slice(offset, offset + limit),
        meta: { pagination: {
          page, limit, next: hasNext ? page + 1 : null,
          next_cursor: hasNext ? sends[offset + limit - 1].post_id : null,
          next_cursor_date: hasNext ? '2026-01-10 12:00:00.000' : null,
        } },
      };
      active -= 1;
      return response;
    }) as unknown as ReturnType<typeof useFetchApi>;

    const result = await fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'America/Sao_Paulo', new AbortController().signal,
    );

    expect(result.stats).toHaveLength(125);
    expect(result.stats.map((item) => item.post_id)).toEqual(sends.map((item) => item.post_id));
    expect(maxActive).toBe(1);
  });

  it('loads click statistics in bounded sequential batches', async () => {
    const postIds = Array.from({ length: 125 }, (_, index) => `post-${index}`);
    const batchSizes: number[] = [];
    let active = 0;
    let maxActive = 0;
    const fetchApi = vi.fn(async (input: string | URL) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      const url = new URL(input);
      expect(url.searchParams.get('newsletter_id')).toBe('newsletter-1');
      const ids = url.searchParams.get('post_ids')?.split(',') ?? [];
      batchSizes.push(ids.length);
      active -= 1;
      return { stats: ids.map((post_id) => ({ post_id, total_clicks: 25, click_rate: 0.25 })) };
    }) as unknown as ReturnType<typeof useFetchApi>;

    const result = await fetchNewsletterPeriodClicks(fetchApi, 'newsletter-1', postIds, new AbortController().signal);
    expect(result.map((item) => item.post_id)).toEqual(postIds);
    expect(batchSizes).toEqual([50, 50, 25]);
    expect(maxActive).toBe(1);
  });

  it('does not present an older backend response as complete', async () => {
    for (const stats of [[], [{ post_id: 'legacy-post' }]]) {
      const fetchApi = vi.fn().mockResolvedValue({ stats, meta: {} }) as unknown as ReturnType<typeof useFetchApi>;
      await expect(fetchNewsletterPeriodStats(
        fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
      )).rejects.toBeInstanceOf(UnsupportedNewsletterPaginationError);
    }
  });

  it('treats a malformed pagination object as an error rather than missing support', async () => {
    const fetchApi = vi.fn().mockResolvedValue({ stats: [], meta: { pagination: null } }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toBeInstanceOf(z.ZodError);
  });

  it('rejects malformed pagination without returning partial results', async () => {
    const fetchApi = vi.fn().mockResolvedValue({
      stats: [], meta: { pagination: { page: 1, limit: 50, next: 1, next_cursor: null, next_cursor_date: null } },
    }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toThrow('Invalid newsletter statistics pagination');
  });

  it('rejects an invalid cursor or duplicate sends on a subsequent page', async () => {
    const sends = Array.from({ length: 50 }, (_, index) => ({
      post_id: `post-${index}`, post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
      sent_to: 100, total_opens: 50, open_rate: 0.5,
    }));
    const firstPage = {
      stats: sends,
      meta: { pagination: {
        page: 1, limit: 50, next: 2, next_cursor: 'post-49', next_cursor_date: '2026-01-10 12:00:00.000',
      } },
    };
    const invalidCursor = vi.fn().mockResolvedValue({
      ...firstPage,
      meta: { pagination: { ...firstPage.meta.pagination, next_cursor: 'post-48' } },
    }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      invalidCursor, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toThrow('Invalid newsletter statistics pagination');

    const duplicate = vi.fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({
        stats: [sends[0]],
        meta: { pagination: { page: 2, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
      }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      duplicate, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toThrow('Duplicate newsletter statistics');
  });

  it('propagates a click request failure instead of returning zero clicks', async () => {
    const fetchApi = vi.fn()
      .mockRejectedValueOnce(new Error('Click request failed')) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodClicks(
      fetchApi, 'newsletter-1', ['post-1'], new AbortController().signal,
    )).rejects.toThrow('Click request failed');
  });

  it('rejects unexpected or duplicate click rows', async () => {
    for (const stats of [
      [{ post_id: 'other', total_clicks: 1, click_rate: 0.1 }],
      [{ post_id: 'post-1', total_clicks: 1, click_rate: 0.1 }, { post_id: 'post-1', total_clicks: 1, click_rate: 0.1 }],
    ]) {
      const fetchApi = vi.fn().mockResolvedValue({ stats }) as unknown as ReturnType<typeof useFetchApi>;
      await expect(fetchNewsletterPeriodClicks(
        fetchApi, 'newsletter-1', ['post-1'], new AbortController().signal,
      )).rejects.toThrow('Invalid newsletter click statistics');
    }
  });

  it('stops before the next click batch when cancelled', async () => {
    const controller = new AbortController();
    const fetchApi = vi.fn(async () => {
      controller.abort();
      return { stats: [] };
    }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodClicks(
      fetchApi, 'newsletter-1', Array.from({ length: 51 }, (_, index) => `post-${index}`), controller.signal,
    )).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchApi).toHaveBeenCalledTimes(1);
  });

  it('stops before the next page when a request is cancelled', async () => {
    const controller = new AbortController();
    const fetchApi = vi.fn(async () => {
      controller.abort();
      return { stats: [], meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } } };
    }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', controller.signal,
    )).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchApi).toHaveBeenCalledTimes(1);
  });

  it('omits the start date when the selected range is All time', async () => {
    mocks.fetchApi.mockReset().mockResolvedValue({
      stats: [], meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
    });
    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.allTime.value, 'newsletter-1'),
      { wrapper: TestWrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = new URL(mocks.fetchApi.mock.calls[0][0]);
    expect(url.searchParams.has('date_from')).toBe(false);
    expect(url.searchParams.get('timezone')).toBeTruthy();
  });

  it('keeps open statistics available when clicks fail and retries only clicks', async () => {
    const basicPage = {
      stats: [{
        post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
        sent_to: 100, total_opens: 50, open_rate: 0.5,
      }],
      meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
    };
    let clicksFail = true;
    mocks.fetchApi.mockReset().mockImplementation(async (input: string | URL) => {
      if (new URL(input).pathname.includes('newsletter-basic-stats')) {
        return basicPage;
      }
      if (clicksFail) {
        throw new Error('Click request failed');
      }
      return { stats: [{ post_id: 'post-1', total_clicks: 25, click_rate: 0.25 }] };
    });

    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1', true, true),
      { wrapper: TestWrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.isClicksError).toBe(true));
    expect(result.current.data?.stats[0]).toMatchObject({ open_rate: 0.5, total_opens: 50 });
    expect(result.current.data?.stats[0].click_rate).toBeUndefined();

    clicksFail = false;
    await result.current.refetchClicks();
    await waitFor(() => expect(result.current.data?.stats[0].click_rate).toBe(0.25));
    const basicRequests = mocks.fetchApi.mock.calls.filter(([input]) =>
      new URL(input).pathname.includes('newsletter-basic-stats'));
    expect(basicRequests).toHaveLength(1);
  });

  it('does not request click statistics when click tracking is disabled', async () => {
    mocks.fetchApi.mockReset().mockImplementation(async (input: string | URL) => {
      if (new URL(input).pathname.includes('newsletter-click-stats')) {
        throw new Error('Unexpected click request');
      }
      return {
        stats: [{
          post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
          sent_to: 100, total_opens: 50, open_rate: 0.5,
        }],
        meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
      };
    });
    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1', true, false),
      { wrapper: TestWrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.stats[0].open_rate).toBe(0.5);
    expect(mocks.fetchApi).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-flight click request when tracking is switched off', async () => {
    let clickSignal: AbortSignal | undefined;
    mocks.fetchApi.mockReset().mockImplementation(async (input: string | URL, options: { signal: AbortSignal }) => {
      if (new URL(input).pathname.includes('newsletter-click-stats')) {
        clickSignal = options.signal;
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      }
      return {
        stats: [{
          post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
          sent_to: 100, total_opens: 50, open_rate: 0.5,
        }],
        meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
      };
    });
    const { result, rerender } = renderHook(
      ({ clickTrackingEnabled }) => useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1', true, clickTrackingEnabled),
      { wrapper: TestWrapper, initialProps: { clickTrackingEnabled: true } },
    );
    await waitFor(() => expect(clickSignal).toBeDefined());
    rerender({ clickTrackingEnabled: false });
    await waitFor(() => expect(clickSignal?.aborted).toBe(true));
    expect(result.current.data?.stats[0].open_rate).toBe(0.5);
    expect(result.current.data?.stats[0].click_rate).toBeUndefined();
  });

  it('hides cached clicks if a refresh fails', async () => {
    let clicksFail = false;
    mocks.fetchApi.mockReset().mockImplementation(async (input: string | URL) => {
      if (new URL(input).pathname.includes('newsletter-basic-stats')) {
        return {
          stats: [{
            post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
            sent_to: 100, total_opens: 50, open_rate: 0.5,
          }],
          meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
        };
      }
      if (clicksFail) {
        throw new Error('Click refresh failed');
      }
      return { stats: [{ post_id: 'post-1', total_clicks: 25, click_rate: 0.25 }] };
    });
    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1', true, true),
      { wrapper: TestWrapper },
    );
    await waitFor(() => expect(result.current.data?.stats[0].click_rate).toBe(0.25));
    clicksFail = true;
    await act(async () => { await result.current.refetchClicks(); });
    await waitFor(() => expect(result.current.isClicksError).toBe(true));
    expect(result.current.data?.stats[0].open_rate).toBe(0.5);
    expect(result.current.data?.stats[0].click_rate).toBeUndefined();
  });

  it('refreshes period data when newsletter stats are invalidated after sending', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000, retry: false } } });
    let basicRequests = 0;
    let clickRequests = 0;
    mocks.fetchApi.mockReset().mockImplementation(async (input: string | URL) => {
      if (new URL(input).pathname.includes('newsletter-basic-stats')) {
        basicRequests += 1;
        return {
          stats: [{
            post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
            sent_to: 100, total_opens: 50, open_rate: 0.5,
          }],
          meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
        };
      }
      clickRequests += 1;
      return { stats: [{ post_id: 'post-1', total_clicks: 25, click_rate: 0.25 }] };
    });
    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1', true, true),
      { wrapper: ({ children }) => createElement(TestWrapper, { queryClient, children }) },
    );
    await waitFor(() => expect(result.current.data?.stats[0].click_rate).toBe(0.25));
    await act(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [newsletterBasicStatsDataType] }),
        queryClient.invalidateQueries({ queryKey: [newsletterClickStatsDataType] }),
      ]);
    });
    expect(basicRequests).toBe(2);
    expect(clickRequests).toBe(2);
  });
});
