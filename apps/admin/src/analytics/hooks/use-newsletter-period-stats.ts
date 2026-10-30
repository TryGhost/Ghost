import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import { STATS_RANGES } from '@/shared/analytics/constants';
import {
  newsletterBasicStatsDataType,
  newsletterClickStatsDataType,
  type NewsletterBasicStatsResponseType,
} from '@tryghost/admin-x-framework/api/stats';

const PAGE_SIZE = 50;

const basicPageSchema = z.object({
  stats: z.array(z.object({
    post_id: z.string().min(1),
    post_title: z.string(),
    send_date: z.string(),
    sent_to: z.number(),
    total_opens: z.number(),
    open_rate: z.number(),
  })),
  meta: z.object({
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive().max(PAGE_SIZE),
      next: z.number().int().positive().nullable(),
      next_cursor: z.string().min(1).nullable(),
      next_cursor_date: z.string().min(1).nullable(),
    }),
  }),
});

const clicksSchema = z.object({
  stats: z.array(z.object({
    post_id: z.string().min(1),
    total_clicks: z.number(),
    click_rate: z.number(),
  })),
});

export class UnsupportedNewsletterPaginationError extends Error {}

export async function fetchNewsletterPeriodStats(
  fetchApi: ReturnType<typeof useFetchApi>,
  newsletterId: string,
  dateFrom: string | undefined,
  dateTo: string,
  timezone: string,
  signal: AbortSignal,
): Promise<NewsletterBasicStatsResponseType> {
  const stats: NewsletterBasicStatsResponseType['stats'] = [];
  const seen = new Set<string>();
  let page = 1;
  let cursor: string | null = null;
  let cursorDate: string | null = null;

  while (true) {
    signal.throwIfAborted();
    const params: Record<string, string> = {
      newsletter_id: newsletterId,
      date_to: dateTo,
      timezone,
      order: 'date desc',
      limit: String(PAGE_SIZE),
      page: String(page),
    };
    if (dateFrom) {
      params.date_from = dateFrom;
    }
    if (cursor) {
      params.after_id = cursor;
      params.after_date = cursorDate!;
    }
    const raw = await fetchApi<unknown>(apiUrl('/stats/newsletter-basic-stats/', params), { signal });
    signal.throwIfAborted();
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw) && 'stats' in raw) {
      const meta = 'meta' in raw ? raw.meta : undefined;
      if (meta === undefined || (typeof meta === 'object' && meta !== null && !Array.isArray(meta) && !('pagination' in meta))) {
        throw new UnsupportedNewsletterPaginationError('Newsletter pagination is unavailable');
      }
    }
    const basic = basicPageSchema.parse(raw);
    const { pagination } = basic.meta;
    if (
      pagination.page !== page ||
      basic.stats.length > pagination.limit ||
      (pagination.next !== null &&
        (pagination.next !== page + 1 || basic.stats.length !== pagination.limit ||
          pagination.next_cursor !== basic.stats.at(-1)?.post_id ||
          pagination.next_cursor_date !== basic.stats.at(-1)?.send_date.replace('T', ' ').replace(/Z$/, ''))) ||
      (pagination.next === null && (pagination.next_cursor !== null || pagination.next_cursor_date !== null))
    ) {
      throw new Error('Invalid newsletter statistics pagination');
    }

    for (const item of basic.stats) {
      if (seen.has(item.post_id)) {
        throw new Error('Duplicate newsletter statistics');
      }
      seen.add(item.post_id);
    }
    stats.push(...basic.stats);

    if (pagination.next === null) {
      return { stats, meta: {} };
    }
    page = pagination.next;
    cursor = pagination.next_cursor;
    cursorDate = pagination.next_cursor_date;
  }
}

export async function fetchNewsletterPeriodClicks(
  fetchApi: ReturnType<typeof useFetchApi>,
  newsletterId: string,
  postIds: string[],
  signal: AbortSignal,
) {
  const stats: z.infer<typeof clicksSchema>['stats'] = [];
  for (let offset = 0; offset < postIds.length; offset += PAGE_SIZE) {
    signal.throwIfAborted();
    const ids = new Set(postIds.slice(offset, offset + PAGE_SIZE));
    const clicks = clicksSchema.parse(await fetchApi<unknown>(apiUrl('/stats/newsletter-click-stats/', {
      newsletter_id: newsletterId,
      post_ids: [...ids].join(','),
    }), { signal })).stats;
    signal.throwIfAborted();
    const seen = new Set<string>();
    for (const click of clicks) {
      if (!ids.has(click.post_id) || seen.has(click.post_id)) {
        throw new Error('Invalid newsletter click statistics');
      }
      seen.add(click.post_id);
    }
    stats.push(...clicks);
  }
  return stats;
}

export function useNewsletterPeriodStats(
  range: number,
  newsletterId?: string,
  enabled = true,
  clickTrackingEnabled = true,
) {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();
  const { dateFrom, dateTo, timezone } = useMemo(() => {
    const { startDate, endDate, timezone: currentTimezone } = getRangeDates(range);
    return {
      dateFrom: range === STATS_RANGES.allTime.value ? undefined : formatQueryDate(startDate),
      dateTo: formatQueryDate(endDate),
      timezone: currentTimezone,
    };
  }, [range]);

  const result = useQuery({
    queryKey: [newsletterBasicStatsDataType, 'period', newsletterId, dateFrom, dateTo, timezone],
    enabled: enabled && !!newsletterId,
    retry: false,
    queryFn: ({ signal }) => fetchNewsletterPeriodStats(fetchApi, newsletterId!, dateFrom, dateTo, timezone, signal),
  });

  const postIds = useMemo(() => result.data?.stats.map((item) => item.post_id) ?? [], [result.data]);
  const shouldFetchClicks = enabled && clickTrackingEnabled && !!newsletterId && postIds.length > 0;
  const clickResult = useQuery({
    queryKey: [newsletterClickStatsDataType, 'period', newsletterId, dateFrom, dateTo, timezone, shouldFetchClicks ? postIds : []],
    enabled: shouldFetchClicks,
    retry: false,
    queryFn: ({ signal }) => fetchNewsletterPeriodClicks(fetchApi, newsletterId!, postIds, signal),
  });

  const data = useMemo(() => {
    if (!result.data || !shouldFetchClicks || !clickResult.data || clickResult.isError) {
      return result.data;
    }
    const clicksByPost = new Map(clickResult.data.map((click) => [click.post_id, click]));
    return {
      ...result.data,
      stats: result.data.stats.map((item) => ({
        ...item,
        total_clicks: clicksByPost.get(item.post_id)?.total_clicks ?? 0,
        click_rate: clicksByPost.get(item.post_id)?.click_rate ?? 0,
      })),
    };
  }, [result.data, shouldFetchClicks, clickResult.data, clickResult.isError]);

  useEffect(() => {
    if (result.error && !(result.error instanceof UnsupportedNewsletterPaginationError)) {
      handleError(result.error, { withToast: false });
    }
  }, [handleError, result.error]);

  useEffect(() => {
    if (shouldFetchClicks && clickResult.error) {
      handleError(clickResult.error, { withToast: false });
    }
  }, [handleError, shouldFetchClicks, clickResult.error]);

  return {
    ...result,
    data,
    isClicksLoading: shouldFetchClicks && clickResult.isLoading,
    isClicksError: shouldFetchClicks && clickResult.isError,
    refetchClicks: clickResult.refetch,
  };
}
