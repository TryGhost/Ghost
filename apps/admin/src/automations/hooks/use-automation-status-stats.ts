import { performanceQueryOptions } from './performance-query-options';
import { useCallback, useMemo, useState } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  matchesAutomationSearch,
  useReadAutomationStatusStats,
} from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationStatusStats } from '@/automations/utils/automation-status-stats';
import { useSearchContinuation } from './use-search-continuation';

export const useAutomationStatusStats = (
  automationId: string,
  requestId: string,
  search = '',
  enabled = true,
) => {
  const [retryRevision, setRetryRevision] = useState(0);
  const query = useReadAutomationStatusStats(automationId, `${requestId}:${retryRevision}`, {
    ...performanceQueryOptions,
    enabled: (cached) => enabled && cached.state.status !== 'error',
    searchParams: search ? { search } : {},
  });
  const stats = query.data?.automation_status_stats[0];
  const wrongAutomation = !!stats && stats.automation_id !== automationId;
  const unsupportedSearch =
    !!search && !!query.data && !matchesAutomationSearch(query.data.meta, search);
  const data = useMemo(
    () =>
      stats && !wrongAutomation && !unsupportedSearch ? mapAutomationStatusStats(stats) : undefined,
    [stats, wrongAutomation, unsupportedSearch],
  );
  const failed = !query.isFetching && (query.isError || wrongAutomation);
  const unavailable =
    unsupportedSearch ||
    (failed && query.error instanceof APIError && query.error.response?.status === 404);
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => {
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage]);
  const scanning = !!search && query.hasNextPage && !unavailable;
  const continuation = useSearchContinuation({
    requestId: `${requestId}:${retryRevision}`,
    pages: query.data?.pages ?? 0,
    scanning,
    enabled,
    fetching: query.isFetching,
    failed,
    loadMore,
  });
  return {
    data: unavailable ? undefined : data,
    stats: stats && !wrongAutomation && !unavailable ? stats : undefined,
    isLoading: !data && !failed && !unavailable,
    isError: failed && !unavailable,
    unavailable,
    scanning,
    ...continuation,
    retry: () => {
      // Expired/invalid count tokens start a fresh count without touching the list.
      if (query.error instanceof APIError && query.error.response?.status === 422) {
        setRetryRevision((value) => value + 1);
      } else if (query.isFetchNextPageError) {
        loadMore();
      } else {
        void query.refetch();
      }
    },
  };
};
