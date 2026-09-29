import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { useReadAutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationEntryStats } from '@/automations/utils/automation-entry-stats';

export const useAutomationEntryStats = (automationId: string, dateRange: PerformanceDateRange) => {
  const query = useReadAutomationPerformanceStats(automationId, {
    ...performanceQueryOptions,
    searchParams: dateRange.searchParams,
  });
  const stats = query.data?.automation_performance_stats[0];
  const chart = useMemo(
    () =>
      stats
        ? mapAutomationEntryStats(stats, dateRange.value === 'all' ? undefined : dateRange.value)
        : undefined,
    [stats, dateRange.value],
  );
  const failed = !query.isFetching && query.isError;

  return {
    chart,
    isLoading: !chart && !failed,
    isError: failed,
    retry: () => {
      void query.refetch();
    },
  };
};
