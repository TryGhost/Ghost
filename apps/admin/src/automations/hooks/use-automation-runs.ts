import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useCallback, useMemo } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { useSearchContinuation } from './use-search-continuation';
import { isSortedRuns } from '@/automations/utils/automation-runs';
import type { RunSort } from '@/automations/types';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  sort: RunSort,
  requestId: string,
  search = '',
  enabled = true,
  dateRange?: PerformanceDateRange,
) => {
  const query = useBrowseAutomationRuns(automationId, requestId, {
    ...performanceQueryOptions,
    enabled: (cached) => enabled && cached.state.status !== 'error',
    searchParams: {
      ...(dateRange?.value === 'all' ? {} : dateRange?.searchParams),
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(sort.direction !== 'desc' ? { order: `${sort.key} ${sort.direction}` } : {}),
    },
  });
  const loaded = query.data?.runs;
  const unsupportedSearch = !!search && !!query.data && !query.data.searchSupported;
  // An older Core ignores `order`; never present its rows under the wrong direction.
  const unsupportedSort = useMemo(
    () => !!loaded && !isSortedRuns(loaded, sort.direction),
    [loaded, sort.direction],
  );
  const unsupportedDate = !!query.data && !query.data.dateSupported;
  const runs = unsupportedDate || unsupportedSort || unsupportedSearch ? undefined : loaded;
  // A failed later page keeps the loaded rows and retries only itself.
  const moreFailed = !query.isFetching && query.isFetchNextPageError;
  const failed = !query.isFetching && query.isError && !query.isFetchNextPageError;
  const unavailable =
    unsupportedDate ||
    (failed && query.error instanceof APIError && query.error.response?.status === 404);
  const { fetchNextPage } = query;
  // Scrolling can ask repeatedly; never cancel and restart a page already in flight.
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  const scanning =
    !!query.data?.scanning &&
    query.hasNextPage &&
    !unsupportedSearch &&
    !unsupportedSort &&
    !unsupportedDate;
  const continuation = useSearchContinuation({
    requestId,
    pages: query.data?.pages ?? 0,
    scanning,
    enabled,
    fetching: query.isFetching,
    failed: moreFailed || failed,
    loadMore,
  });
  return {
    runs,
    scanning,
    ...continuation,
    unsupportedSearch,
    isLoading: !runs && !failed && !unsupportedSort && !unsupportedSearch && !unsupportedDate,
    isError: failed && !unavailable && !unsupportedSort && !unsupportedSearch && !unsupportedDate,
    unavailable,
    unsupportedSort,
    retry: () => {
      void query.refetch();
    },
    canLoadMore: enabled && !!runs && query.hasNextPage && !moreFailed && !scanning,
    isLoadingMore: query.isFetchingNextPage,
    isMoreError: moreFailed,
    loadMore,
  };
};
