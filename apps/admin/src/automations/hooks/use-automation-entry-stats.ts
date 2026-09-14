import { performanceQueryOptions } from './performance-query-options';
import { useMemo } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useReadAutomationEntryStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationEntryStats } from '@/automations/utils/automation-entry-stats';

export const useAutomationEntryStats = (automationId: string) => {
  const query = useReadAutomationEntryStats(automationId, performanceQueryOptions);
  const stats = query.data?.automation_entry_stats[0];
  // Never display a response for a different automation, including cached data.
  const wrongAutomation = !!stats && stats.automation_id !== automationId;
  const chart = useMemo(
    () => (stats && !wrongAutomation ? mapAutomationEntryStats(stats) : undefined),
    [stats, wrongAutomation],
  );
  const failed = !query.isFetching && (query.isError || wrongAutomation);
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;

  return {
    chart: unavailable ? undefined : chart,
    isLoading: !chart && !failed && !unavailable,
    isError: failed && !unavailable,
    unavailable,
    retry: () => {
      void query.refetch();
    },
  };
};
