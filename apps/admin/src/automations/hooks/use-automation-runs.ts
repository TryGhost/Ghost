import { useMemo } from 'react';
import { usePerformanceQueryVisit } from './use-performance-query-visit';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useBrowseAutomationRuns } from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { mapAutomationRuns } from '@/automations/utils/automation-runs';

export const useAutomationRuns = (automationId: string) => {
  const meta = usePerformanceQueryVisit(automationId);
  const query = useBrowseAutomationRuns(automationId, {
    ...performanceQueryOptions,
    meta,
  });
  const runs = query.data?.automation_runs;
  const data = useMemo(() => runs && mapAutomationRuns(runs), [runs]);
  const failed = !query.isFetching && query.isError;
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;
  return {
    data,
    isLoading: !data && !failed,
    isError: failed && !unavailable,
    unavailable,
    retry: () => {
      void query.refetch();
    },
  };
};
