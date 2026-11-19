import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  type CommentsAnalyticsTab,
  type CommentsCustomRange,
  CUSTOM_COMMENTS_RANGE,
  DEFAULT_COMMENTS_ANALYTICS_RANGE,
  getCommentsListFilter,
  getCommentsStatsSearchParams,
  parseCommentsCustomRange,
  parseRangeParam,
  parseTabParam,
} from './comments-analytics-helpers';
import {
  useCommentsOverview,
  useCommentsTopCommenters,
  useCommentsTopPosts,
} from '@tryghost/admin-x-framework/api/stats';
import { useCallback } from 'react';
import { useSearchParams } from '@tryghost/admin-x-framework';
import { parseCommentFilter, serializeCommentFilters } from '@/comments/comment-filter-query';
import { removeLegacyCommentFilterParams } from '@/comments/legacy-comment-filter-query';

const isNotFound = (error: unknown) => error instanceof APIError && error.response?.status === 404;

export function useCommentsAnalytics(timezone: string, enabled: boolean, filter?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedRange = parseRangeParam(searchParams.get('range'));
  const customRange =
    parsedRange === CUSTOM_COMMENTS_RANGE
      ? parseCommentsCustomRange(
          searchParams.get('date_from'),
          searchParams.get('date_to'),
          timezone,
        )
      : undefined;
  const range =
    parsedRange === CUSTOM_COMMENTS_RANGE && !customRange
      ? DEFAULT_COMMENTS_ANALYTICS_RANGE
      : parsedRange;
  const tab = parseTabParam(searchParams.get('tab'));

  const query = {
    // Not memoised: date_to must move on when the site's day changes
    searchParams: {
      ...getCommentsStatsSearchParams(range, timezone, customRange),
      ...(filter ? { filter } : {}),
    },
    enabled,
    // Older Core has no endpoint: hide the panel instead of toasting the 404
    defaultErrorHandler: false,
  };
  const overview = useCommentsOverview(query);
  const topPosts = useCommentsTopPosts(query);
  const topCommenters = useCommentsTopCommenters(query);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(key, value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setDateRange = useCallback(
    (value: number, dates?: CommentsCustomRange) => {
      const next = new URLSearchParams(searchParams);
      next.set('range', value === CUSTOM_COMMENTS_RANGE ? 'custom' : String(value));
      next.delete('date_from');
      next.delete('date_to');
      if (dates) {
        next.set('date_from', dates.from);
        next.set('date_to', dates.to);
      }
      // Old bookmarked Date filters remain visible until a new range replaces them.
      const remaining = parseCommentFilter(filter, timezone).filter(
        ({ field }) => field !== 'created_at',
      );
      const nql = serializeCommentFilters(remaining, timezone);
      next.delete('filter');
      removeLegacyCommentFilterParams(next);
      if (nql) {
        next.set('filter', nql);
      }
      setSearchParams(next, { replace: true });
    },
    [filter, searchParams, setSearchParams, timezone],
  );

  return {
    range,
    customRange,
    listFilter: getCommentsListFilter(range, timezone, filter, customRange),
    setRange: useCallback((value: number) => setDateRange(value), [setDateRange]),
    setCustomRange: useCallback(
      (value: CommentsCustomRange) => {
        const dates = parseCommentsCustomRange(value.from, value.to, timezone);
        if (dates) {
          setDateRange(CUSTOM_COMMENTS_RANGE, dates);
        }
      },
      [setDateRange, timezone],
    ),
    tab,
    setTab: useCallback((value: CommentsAnalyticsTab) => setParam('tab', value), [setParam]),
    overview,
    topPosts,
    topCommenters,
    unavailable: [overview, topPosts, topCommenters].some(
      ({ error, data }) => isNotFound(error) || (data !== undefined && data.meta?.filters !== true),
    ),
  };
}

export type CommentsAnalytics = ReturnType<typeof useCommentsAnalytics>;
