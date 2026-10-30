import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { TestWrapper } from '@test-utils/fixtures/query-client';
import { STATS_RANGES } from '@/shared/analytics/constants';
import type { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import {
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
  it('loads every page and its click statistics with bounded sequential requests', async () => {
    const sends = Array.from({ length: 125 }, (_, index) => ({
      post_id: String(index).padStart(24, '0'),
      post_title: `Issue ${index}`,
      send_date: '2026-01-10T12:00:00.000Z',
      sent_to: 100,
      total_opens: index,
      open_rate: index / 125,
    }));
    const clickBatchSizes: number[] = [];
    let active = 0;
    let maxActive = 0;
    const fetchApi = vi.fn(async (input: string | URL) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      const url = new URL(input);
      expect(url.searchParams.get('newsletter_id')).toBe('newsletter-1');
      let response: unknown;
      if (url.pathname.includes('newsletter-basic-stats')) {
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
        response = {
          stats: sends.slice(offset, offset + limit),
          meta: { pagination: {
            page, limit, next: hasNext ? page + 1 : null,
            next_cursor: hasNext ? sends[offset + limit - 1].post_id : null,
            next_cursor_date: hasNext ? '2026-01-10 12:00:00.000' : null,
          } },
        };
      } else {
        const ids = url.searchParams.get('post_ids')?.split(',') ?? [];
        clickBatchSizes.push(ids.length);
        response = { stats: ids.map((post_id) => ({ post_id, total_clicks: 25, click_rate: 0.25 })) };
      }
      active -= 1;
      return response;
    }) as unknown as ReturnType<typeof useFetchApi>;

    const result = await fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'America/Sao_Paulo', new AbortController().signal,
    );

    expect(result.stats).toHaveLength(125);
    expect(result.stats.map((item) => item.post_id)).toEqual(sends.map((item) => item.post_id));
    expect(result.stats.every((item) => item.click_rate === 0.25)).toBe(true);
    expect(clickBatchSizes).toEqual([50, 50, 25]);
    expect(maxActive).toBe(1);
  });

  it('does not present an older backend response as complete', async () => {
    const fetchApi = vi.fn().mockResolvedValue({ stats: [], meta: {} }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toBeInstanceOf(UnsupportedNewsletterPaginationError);
  });

  it('rejects malformed pagination without returning partial results', async () => {
    const fetchApi = vi.fn().mockResolvedValue({
      stats: [], meta: { pagination: { page: 1, limit: 50, next: 1, next_cursor: null, next_cursor_date: null } },
    }) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toThrow('Invalid newsletter statistics pagination');
  });

  it('propagates a click request failure instead of returning zero clicks', async () => {
    const fetchApi = vi.fn()
      .mockResolvedValueOnce({
        stats: [{
          post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10T12:00:00.000Z',
          sent_to: 100, total_opens: 50, open_rate: 0.5,
        }],
        meta: { pagination: { page: 1, limit: 50, next: null, next_cursor: null, next_cursor_date: null } },
      })
      .mockRejectedValueOnce(new Error('Click request failed')) as unknown as ReturnType<typeof useFetchApi>;
    await expect(fetchNewsletterPeriodStats(
      fetchApi, 'newsletter-1', '2026-01-01', '2026-01-31', 'UTC', new AbortController().signal,
    )).rejects.toThrow('Click request failed');
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
});
