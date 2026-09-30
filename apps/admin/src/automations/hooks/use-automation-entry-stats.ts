import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { useReadAutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationEntryStats } from '@/automations/utils/automation-entry-stats';

export const useAutomationEntryStats = (automationId: string) => {
  const query = useReadAutomationPerformanceStats(automationId, performanceQueryOptions);
  const stats = query.data?.automation_performance_stats[0];
  const chart = useMemo(() => (stats ? mapAutomationEntryStats(stats) : undefined), [stats]);
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
