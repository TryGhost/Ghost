import { useMemo } from 'react';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useBrowseAutomationRuns } from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { mapAutomationRuns } from '@/automations/utils/automation-runs';

export const useAutomationRuns = (
  automationId: string,
  queryScope: string,
  dateRange: PerformanceDateRange,
) => {
  const query = useBrowseAutomationRuns(automationId, queryScope, {
    ...performanceQueryOptions,
    searchParams: dateRange.searchParams,
  });
  const runs = query.data?.automation_runs;
  const data = useMemo(() => runs && mapAutomationRuns(runs), [runs]);
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
