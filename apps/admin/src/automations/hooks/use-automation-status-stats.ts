import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { useReadAutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationStatusStats } from '@/automations/utils/automation-status-stats';

export const useAutomationStatusStats = (automationId: string) => {
  const query = useReadAutomationPerformanceStats(automationId, performanceQueryOptions);
  const stats = query.data?.automation_performance_stats[0];
  const data = useMemo(() => (stats ? mapAutomationStatusStats(stats) : undefined), [stats]);
  const failed = !query.isFetching && query.isError;

  return {
    data,
    isLoading: !data && !failed,
    isError: failed,
    retry: () => {
      void query.refetch();
    },
  };
};
