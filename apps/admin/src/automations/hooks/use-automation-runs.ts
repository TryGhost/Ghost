import { keepPreviousData } from '@tanstack/react-query';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useCallback, useEffect } from 'react';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import type { RunSortDirection } from '@/automations/types';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  direction: RunSortDirection,
  queryScope: string,
  dateRange: PerformanceDateRange,
  search = '',
  enabled = true,
  updating = false,
) => {
  const query = useBrowseAutomationRuns(automationId, queryScope, {
    ...performanceQueryOptions,
    enabled: !updating,
    // Date changes remount RunList; list controls retain rows while fetching.
    placeholderData: keepPreviousData,
    searchParams: {
      ...(search ? { search } : { ...dateRange.searchParams, ...(status ? { status } : {}) }),
      ...(direction === 'asc' ? { order: 'created_at asc' } : {}),
    },
  });
  const runs = query.data?.runs;
  const scanning = !query.isPlaceholderData && !!query.data?.scanning;
  // A failed later page keeps the loaded rows and retries only itself.
  const nextPageFailed = !query.isFetching && query.isFetchNextPageError;
  const failed = !query.isFetching && query.isError && !query.isFetchNextPageError;
  const { fetchNextPage } = query;
  // Scrolling can ask repeatedly; never cancel and restart a page already in flight.
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  // A scan can return no matches before reaching the end. Continue sequentially.
  useEffect(() => {
    if (enabled && !updating && scanning && !query.isFetching && !query.isError) {
      loadMore();
    }
  }, [enabled, updating, scanning, query.isFetching, query.isError, query.data, loadMore]);
  return {
    runs,
    scanning,
    isLoading: updating || (query.isFetching && !query.isFetchingNextPage),
    isError: !updating && failed,
    retry: () => {
      void query.refetch();
    },
    canLoadMore:
      enabled &&
      !updating &&
      !scanning &&
      !!runs &&
      !query.isPlaceholderData &&
      query.hasNextPage &&
      !nextPageFailed,
    isLoadingMore: query.isFetchingNextPage,
    isNextPageError: nextPageFailed,
    loadMore,
  };
};
