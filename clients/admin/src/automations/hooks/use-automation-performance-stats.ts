import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { useReadAutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationStatusStats } from '@/automations/utils/automation-status-stats';
import { mapAutomationEntryStats } from '@/automations/utils/automation-entry-stats';

export const useAutomationPerformanceStats = (
  automationId: string,
  dateRange: PerformanceDateRange,
  queryScope = '',
) => {
  const query = useReadAutomationPerformanceStats(
    automationId,
    {
      ...performanceQueryOptions,
      searchParams: dateRange.searchParams,
    },
    queryScope,
  );
  const stats = query.data?.automation_performance_stats[0];
  const chart = useMemo(
    () =>
      stats
        ? mapAutomationEntryStats(stats, dateRange.value === 'all' ? undefined : dateRange.value)
        : undefined,
    [stats, dateRange.value],
  );
  const counts = useMemo(() => (stats ? mapAutomationStatusStats(stats) : undefined), [stats]);
  const failed = !query.isFetching && query.isError;

  return {
    chart,
    counts,
    isLoading: !chart && !failed,
    isError: failed,
    retry: () => {
      void query.refetch();
    },
  };
};
