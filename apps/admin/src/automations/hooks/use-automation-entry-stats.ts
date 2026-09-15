import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { usePerformanceQueryVisit } from './use-performance-query-visit';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useReadAutomationEntryStats } from '@tryghost/admin-x-framework/api/automations';
import {
  matchesPerformanceDateRange,
  type PerformanceDateRange,
} from '@/automations/utils/performance-date-range';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { mapAutomationEntryStats } from '@/automations/utils/automation-entry-stats';

export const useAutomationEntryStats = (automationId: string, dateRange: PerformanceDateRange) => {
  const meta = usePerformanceQueryVisit(automationId);
  const query = useReadAutomationEntryStats(automationId, {
    ...performanceQueryOptions,
    gcTime: Infinity,
    refetchOnMount: false,
    // Returning to a failed range keeps its error until an explicit retry.
    enabled: (cachedQuery) => cachedQuery.state.status !== 'error',
    meta,
    searchParams: dateRange.searchParams,
  });
  const stats = query.data?.automation_entry_stats[0];
  // Never display a response for a different automation, including cached data.
  const wrongAutomation = !!stats && stats.automation_id !== automationId;
  const wrongRange = !!stats && !matchesPerformanceDateRange(stats, dateRange);
  const chart = useMemo(
    () =>
      stats && !wrongAutomation && !wrongRange
        ? mapAutomationEntryStats(
            stats,
            dateRange.value === 'all' ? STATS_RANGES.allTime.value : dateRange.value,
          )
        : undefined,
    [stats, wrongAutomation, wrongRange, dateRange.value],
  );
  const failed = !query.isFetching && (query.isError || wrongAutomation || wrongRange);
  const unavailable =
    failed &&
    (wrongRange || (query.error instanceof APIError && query.error.response?.status === 404));

  return {
    chart: unavailable ? undefined : chart,
    isLoading: !chart && !failed,
    isError: failed && !unavailable,
    unavailable,
    retry: () => {
      void query.refetch();
    },
  };
};
