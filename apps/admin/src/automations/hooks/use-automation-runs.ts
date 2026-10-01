import { useMemo } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { mapAutomationRuns } from '@/automations/utils/automation-runs';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  queryScope: string,
  dateRange: PerformanceDateRange,
) => {
  const query = useBrowseAutomationRuns(automationId, queryScope, {
    ...performanceQueryOptions,
    // RunList remounts on date/automation changes; retain rows only for list controls.
    placeholderData: keepPreviousData,
    searchParams: { ...dateRange.searchParams, ...(status ? { status } : {}) },
  });
  const runs = query.data?.automation_runs;
  const data = useMemo(() => runs && mapAutomationRuns(runs), [runs]);
  const failed = !query.isFetching && query.isError;
  return {
    data,
    isLoading: query.isFetching,
    isError: failed,
    retry: () => {
      void query.refetch();
    },
  };
};
