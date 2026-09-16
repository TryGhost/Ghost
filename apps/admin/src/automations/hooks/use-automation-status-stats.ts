import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useReadAutomationStatusStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationStatusStats } from '@/automations/utils/automation-status-stats';

export const useAutomationStatusStats = (automationId: string, requestId: string) => {
  const query = useReadAutomationStatusStats(automationId, requestId, performanceQueryOptions);
  const stats = query.data?.automation_status_stats[0];
  // Never display a response for a different automation, including cached data.
  const wrongAutomation = !!stats && stats.automation_id !== automationId;
  const data = useMemo(
    () => (stats && !wrongAutomation ? mapAutomationStatusStats(stats) : undefined),
    [stats, wrongAutomation],
  );
  const failed = !query.isFetching && (query.isError || wrongAutomation);
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;

  return {
    data: unavailable ? undefined : data,
    stats: stats && !wrongAutomation && !unavailable ? stats : undefined,
    isLoading: !data && !failed,
    isError: failed && !unavailable,
    unavailable,
    retry: () => {
      void query.refetch();
    },
  };
};
