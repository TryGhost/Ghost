import { useCallback, useMemo } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { isSortedRuns } from '@/automations/utils/automation-runs';
import type { RunSort } from '@/automations/types';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  sort: RunSort,
  requestId: string,
) => {
  const query = useBrowseAutomationRuns(automationId, requestId, {
    ...performanceQueryOptions,
    searchParams: {
      ...(status ? { status } : {}),
      ...(sort.direction !== 'desc' ? { order: `${sort.key} ${sort.direction}` } : {}),
    },
  });
  const loaded = query.data;
  // An older Core ignores `order`; never present its rows under the wrong direction.
  const unsupportedSort = useMemo(
    () => !!loaded && !isSortedRuns(loaded, sort.direction),
    [loaded, sort.direction],
  );
  const runs = unsupportedSort ? undefined : loaded;
  // A failed later page keeps the loaded rows and retries only itself.
  const moreFailed = !query.isFetching && query.isFetchNextPageError;
  const failed = !query.isFetching && query.isError && !query.isFetchNextPageError;
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;
  const { fetchNextPage } = query;
  // Scrolling can ask repeatedly; never cancel and restart a page already in flight.
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  return {
    runs,
    isLoading: !runs && !failed && !unsupportedSort,
    isError: failed && !unavailable && !unsupportedSort,
    unavailable,
    unsupportedSort,
    retry: () => {
      void query.refetch();
    },
    canLoadMore: !!runs && query.hasNextPage && !moreFailed,
    isLoadingMore: query.isFetchingNextPage,
    isMoreError: moreFailed,
    loadMore,
  };
};
