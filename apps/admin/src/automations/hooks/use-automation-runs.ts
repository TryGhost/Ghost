import { useMemo } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { mapAutomationRuns } from '@/automations/utils/automation-runs';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  requestId: string,
) => {
  const query = useBrowseAutomationRuns(automationId, requestId, {
    ...performanceQueryOptions,
    searchParams: status ? { status } : undefined,
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
