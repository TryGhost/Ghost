import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  type CommentsAnalyticsTab,
  getCommentsStatsSearchParams,
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

const isNotFound = (error: unknown) => error instanceof APIError && error.response?.status === 404;

export function useCommentsAnalytics(timezone: string, enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = parseRangeParam(searchParams.get('range'));
  const tab = parseTabParam(searchParams.get('tab'));

  const query = {
    // Not memoised: date_to must move on when the site's day changes
    searchParams: getCommentsStatsSearchParams(range, timezone),
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

  return {
    range,
    setRange: useCallback((value: number) => setParam('range', String(value)), [setParam]),
    tab,
    setTab: useCallback((value: CommentsAnalyticsTab) => setParam('tab', value), [setParam]),
    overview,
    topPosts,
    topCommenters,
    unavailable: [overview, topPosts, topCommenters].some(({ error }) => isNotFound(error)),
  };
}

export type CommentsAnalytics = ReturnType<typeof useCommentsAnalytics>;
