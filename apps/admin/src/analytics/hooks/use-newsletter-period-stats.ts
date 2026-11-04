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
  stats: z.array(
    z.object({
      post_id: z.string().min(1),
      post_title: z.string(),
      send_date: z.string().min(1),
      sent_to: z.number(),
      total_opens: z.number(),
      open_rate: z.number(),
    }),
  ),
  meta: z.object({
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive().max(PAGE_SIZE),
      next: z.number().int().positive().nullable(),
    }),
  }),
});

const clicksSchema = z.object({
  stats: z.array(
    z.object({
      post_id: z.string().min(1),
      total_clicks: z.number(),
      click_rate: z.number(),
    }),
  ),
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
    const raw = await fetchApi<unknown>(apiUrl('/stats/newsletter-basic-stats/', params), {
      signal,
    });
    signal.throwIfAborted();
    const response = raw as { stats?: unknown; meta?: { pagination?: unknown } } | null;
    if (Array.isArray(response?.stats) && response?.meta?.pagination === undefined) {
      throw new UnsupportedNewsletterPaginationError('Newsletter pagination is unavailable');
    }
    const basic = basicPageSchema.parse(raw);
    const { pagination } = basic.meta;
    if (
      pagination.page !== page ||
      basic.stats.length > pagination.limit ||
      (pagination.next !== null && (pagination.next !== page + 1 || basic.stats.length === 0))
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
    const last = basic.stats.at(-1)!;
    page = pagination.next;
    cursor = last.post_id;
    cursorDate = last.send_date.replace('T', ' ').replace(/Z$/, '');
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
    const clicks = clicksSchema.parse(
      await fetchApi<unknown>(
        apiUrl('/stats/newsletter-click-stats/', {
          newsletter_id: newsletterId,
          post_ids: postIds.slice(offset, offset + PAGE_SIZE).join(','),
          fail_on_error: 'true',
        }),
        { signal },
      ),
    ).stats;
    signal.throwIfAborted();
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
    queryFn: ({ signal }) =>
      fetchNewsletterPeriodStats(fetchApi, newsletterId!, dateFrom, dateTo, timezone, signal),
  });

  const postIds = useMemo(
    () => result.data?.stats.map((item) => item.post_id) ?? [],
    [result.data],
  );
  const shouldFetchClicks = enabled && clickTrackingEnabled && !!newsletterId && postIds.length > 0;
  const clickResult = useQuery({
    queryKey: [
      newsletterClickStatsDataType,
      'period',
      newsletterId,
      dateFrom,
      dateTo,
      timezone,
      shouldFetchClicks ? postIds : [],
    ],
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
