import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { TestWrapper } from '@test-utils/fixtures/query-client';
import {
  newsletterBasicStatsDataType,
  newsletterClickStatsDataType,
} from '@tryghost/admin-x-framework/api/stats';
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

const send = (index = 0) => ({
  post_id: 'post-' + index,
  post_title: 'Post',
  send_date: '2026-01-10T12:00:00.000Z',
  sent_to: 100,
  total_opens: 50,
  open_rate: 0.5,
});
const cursorDate = '2026-01-10 12:00:00.000';
const page = (stats: ReturnType<typeof send>[], number = 1, hasNext = false) => ({
  stats,
  meta: {
    pagination: {
      page: number,
      limit: 50,
      next: hasNext ? number + 1 : null,
    },
  },
});
const asFetch = (value: unknown) => value as ReturnType<typeof useFetchApi>;
const load = (fetchApi: unknown, signal = new AbortController().signal) =>
  fetchNewsletterPeriodStats(
    asFetch(fetchApi),
    'newsletter-1',
    '2026-01-01',
    '2026-01-31',
    'America/Sao_Paulo',
    signal,
  );
const basicPage = page([send()]);
const click = { post_id: 'post-0', total_clicks: 25, click_rate: 0.25 };

describe('newsletter period statistics', () => {
  it('loads every page and batches clicks sequentially for more than 100 sends', async () => {
    const sends = Array.from({ length: 125 }, (_, index) => send(index));
    const sizes: number[] = [];
    let active = 0;
    let maxActive = 0;
    const fetchApi = vi.fn(async (input: string | URL) => {
      maxActive = Math.max(maxActive, ++active);
      await Promise.resolve();
      const url = new URL(input);
      const params = url.searchParams;
      expect(params.get('newsletter_id')).toBe('newsletter-1');
      if (url.pathname.includes('newsletter-click-stats')) {
        expect(params.get('fail_on_error')).toBe('true');
        const ids = params.get('post_ids')!.split(',');
        sizes.push(ids.length);
        active -= 1;
        return { stats: ids.map((post_id) => ({ ...click, post_id })) };
      }
      expect(params.get('date_from')).toBe('2026-01-01');
      expect(params.get('date_to')).toBe('2026-01-31');
      expect(params.get('timezone')).toBe('America/Sao_Paulo');
      const afterId = params.get('after_id');
      const offset = afterId ? sends.findIndex((item) => item.post_id === afterId) + 1 : 0;
      if (afterId) {
        expect(params.get('after_date')).toBe(cursorDate);
      }
      // The server may clamp the requested page size below 50.
      const stats = sends.slice(offset, offset + 25);
      active -= 1;
      const result = page(stats, Number(params.get('page')), offset + stats.length < sends.length);
      result.meta.pagination.limit = 25;
      return result;
    });
    expect((await load(fetchApi)).stats).toEqual(sends);
    const clicks = await fetchNewsletterPeriodClicks(
      asFetch(fetchApi),
      'newsletter-1',
      sends.map((s) => s.post_id),
      new AbortController().signal,
    );
    expect(clicks.map((s) => s.post_id)).toEqual(sends.map((s) => s.post_id));
    expect(sizes).toEqual([50, 50, 25]);
    expect(fetchApi).toHaveBeenCalledTimes(8);
    expect(maxActive).toBe(1);
  });

  it.each([
    ['2026-01-10 12:00:00.123456', '2026-01-10 12:00:00.123456'],
    ['2026-01-10T12:00:00.123Z', '2026-01-10 12:00:00.123'],
  ])('uses the last send date as the next cursor: %s', async (sendDate, expectedDate) => {
    const first = page([{ ...send(), send_date: sendDate }], 1, true);
    const fetchApi = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(page([send(1)], 2));
    expect((await load(fetchApi)).stats).toHaveLength(2);
    const params = new URL(fetchApi.mock.calls[1][0]).searchParams;
    expect(params.get('after_id')).toBe('post-0');
    expect(params.get('after_date')).toBe(expectedDate);
  });

  it('detects old backends and rejects malformed pages, repeated cursors and duplicate sends', async () => {
    for (const stats of [[], [{ post_id: 'legacy-post' }]]) {
      await expect(load(vi.fn().mockResolvedValue({ stats, meta: {} }))).rejects.toBeInstanceOf(
        UnsupportedNewsletterPaginationError,
      );
    }
    await expect(
      load(vi.fn().mockResolvedValue({ stats: [], meta: { pagination: null } })),
    ).rejects.toBeInstanceOf(z.ZodError);
    await expect(load(vi.fn().mockResolvedValue({}))).rejects.toBeInstanceOf(z.ZodError);
    const sends = Array.from({ length: 50 }, (_, index) => send(index));
    const first = page(sends, 1, true);
    const pagination = first.meta.pagination;
    await expect(
      load(
        vi.fn().mockResolvedValue({
          ...first,
          meta: { pagination: { ...pagination, next: 3 } },
        }),
      ),
    ).rejects.toThrow('Invalid newsletter statistics pagination');
    await expect(
      load(vi.fn().mockResolvedValue(page([{ ...send(), send_date: '' }], 1, true))),
    ).rejects.toBeInstanceOf(z.ZodError);
    const next = (response: unknown) =>
      vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(response);
    await expect(load(next(page([sends[0]], 2)))).rejects.toThrow(
      'Duplicate newsletter statistics',
    );
    await expect(
      load(next({ stats: [], meta: { pagination: { ...pagination, page: 2, next: 3 } } })),
    ).rejects.toThrow('Invalid newsletter statistics pagination');
  });

  it('stops before another page or batch on cancellation', async () => {
    for (const kind of ['basic', 'clicks']) {
      const controller = new AbortController();
      const fetchApi = vi.fn(async (_url: string | URL, options: { signal: AbortSignal }) => {
        expect(options.signal).toBe(controller.signal);
        controller.abort();
        return kind === 'basic' ? page([]) : { stats: [] };
      });
      const request =
        kind === 'basic'
          ? load(fetchApi, controller.signal)
          : fetchNewsletterPeriodClicks(
              asFetch(fetchApi),
              'newsletter-1',
              Array.from({ length: 51 }, (_, i) => send(i).post_id),
              controller.signal,
            );
      await expect(request).rejects.toMatchObject({ name: 'AbortError' });
      expect(fetchApi).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps opens when clicks fail, retries only clicks, and hides stale clicks on refresh failure', async () => {
    let clicksFail = true;
    mocks.fetchApi.mockReset().mockImplementation(async (input: string | URL) => {
      if (new URL(input).pathname.includes('newsletter-basic-stats')) {
        return basicPage;
      }
      if (clicksFail) {
        throw new Error('Click request failed');
      }
      return { stats: [click] };
    });
    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1'),
      { wrapper: TestWrapper },
    );
    await waitFor(() => expect(result.current.isClicksError).toBe(true));
    expect(result.current.data?.stats[0]).toMatchObject({ open_rate: 0.5, total_opens: 50 });
    expect(result.current.data?.stats[0].click_rate).toBeUndefined();
    clicksFail = false;
    await act(async () => {
      await result.current.refetchClicks();
    });
    await waitFor(() => expect(result.current.data?.stats[0].click_rate).toBe(0.25));
    clicksFail = true;
    await act(async () => {
      await result.current.refetchClicks();
    });
    await waitFor(() => expect(result.current.isClicksError).toBe(true));
    expect(result.current.data?.stats[0].click_rate).toBeUndefined();
    expect(
      mocks.fetchApi.mock.calls.filter(([input]) =>
        new URL(input).pathname.includes('newsletter-basic-stats'),
      ),
    ).toHaveLength(1);
  });

  it('waits for click tracking and cancels an in-flight request when disabled', async () => {
    let clickSignal: AbortSignal | undefined;
    mocks.fetchApi
      .mockReset()
      .mockImplementation(async (input: string | URL, options: { signal: AbortSignal }) => {
        if (new URL(input).pathname.includes('newsletter-basic-stats')) {
          return basicPage;
        }
        clickSignal = options.signal;
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      });
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useNewsletterPeriodStats(STATS_RANGES.last30Days.value, 'newsletter-1', true, enabled),
      { wrapper: TestWrapper, initialProps: { enabled: false } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchApi).toHaveBeenCalledTimes(1);
    rerender({ enabled: true });
    await waitFor(() => expect(clickSignal).toBeDefined());
    rerender({ enabled: false });
    await waitFor(() => expect(clickSignal?.aborted).toBe(true));
    expect(result.current.data?.stats[0].open_rate).toBe(0.5);
    expect(result.current.data?.stats[0].click_rate).toBeUndefined();
  });

  it('omits the All time start date and refreshes when newsletter stats are invalidated', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 300_000, retry: false } },
    });
    mocks.fetchApi
      .mockReset()
      .mockImplementation(async (input: string | URL) =>
        new URL(input).pathname.includes('newsletter-basic-stats') ? basicPage : { stats: [click] },
      );
    const { result } = renderHook(
      () => useNewsletterPeriodStats(STATS_RANGES.allTime.value, 'newsletter-1'),
      { wrapper: ({ children }) => createElement(TestWrapper, { queryClient, children }) },
    );
    await waitFor(() => expect(result.current.data?.stats[0].click_rate).toBe(0.25));
    const params = new URL(mocks.fetchApi.mock.calls[0][0]).searchParams;
    expect(params.has('date_from')).toBe(false);
    expect(params.get('timezone')).toBeTruthy();
    await act(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [newsletterBasicStatsDataType] }),
        queryClient.invalidateQueries({ queryKey: [newsletterClickStatsDataType] }),
      ]);
    });
    expect(mocks.fetchApi).toHaveBeenCalledTimes(4);
  });
});
