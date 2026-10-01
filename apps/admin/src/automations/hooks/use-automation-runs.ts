import { keepPreviousData } from '@tanstack/react-query';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useCallback } from 'react';
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
  const runs = query.data;
  // A failed later page keeps the loaded rows and retries only itself.
  const nextPageFailed = !query.isFetching && query.isFetchNextPageError;
  const failed = !query.isFetching && query.isError && !query.isFetchNextPageError;
  const { fetchNextPage } = query;
  // Scrolling can ask repeatedly; never cancel and restart a page already in flight.
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  return {
    runs,
    isLoading: query.isFetching && !query.isFetchingNextPage,
    isError: failed,
    retry: () => {
      void query.refetch();
    },
    canLoadMore: !!runs && !query.isPlaceholderData && query.hasNextPage && !nextPageFailed,
    isLoadingMore: query.isFetchingNextPage,
    isNextPageError: nextPageFailed,
    loadMore,
  };
};
