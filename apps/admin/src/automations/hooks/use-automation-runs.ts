import { keepPreviousData } from '@tanstack/react-query';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useCallback, useMemo } from 'react';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { isSortedByEntry } from '@/automations/utils/automation-runs';
import type { RunSortDirection } from '@/automations/types';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  direction: RunSortDirection,
  queryScope: string,
  dateRange: PerformanceDateRange,
) => {
  const query = useBrowseAutomationRuns(automationId, queryScope, {
    ...performanceQueryOptions,
    // Date changes remount RunList; list controls retain rows while fetching.
    placeholderData: keepPreviousData,
    searchParams: {
      ...dateRange.searchParams,
      ...(status ? { status } : {}),
      ...(direction === 'asc' ? { order: 'created_at asc' } : {}),
    },
  });
  const loaded = query.data;
  // An older Core ignores `order`; never present its rows under the wrong direction.
  const unsupportedSort = useMemo(
    () => !query.isPlaceholderData && !!loaded && !isSortedByEntry(loaded, direction),
    [loaded, direction, query.isPlaceholderData],
  );
  const runs = unsupportedSort ? undefined : loaded;
  // A failed later page keeps the loaded rows and retries only itself.
  const moreFailed = !query.isFetching && query.isFetchNextPageError;
  const failed = !query.isFetching && query.isError && !query.isFetchNextPageError;
  const { fetchNextPage } = query;
  // Scrolling can ask repeatedly; never cancel and restart a page already in flight.
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  return {
    runs,
    isLoading: query.isFetching && !query.isFetchingNextPage,
    isError: failed || unsupportedSort,
    unsupportedSort,
    retry: () => {
      void query.refetch();
    },
    canLoadMore: !!runs && !query.isPlaceholderData && query.hasNextPage && !moreFailed,
    isLoadingMore: query.isFetchingNextPage,
    isMoreError: moreFailed,
    loadMore,
  };
};
