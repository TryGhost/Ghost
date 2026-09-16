import { useMemo } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  useBrowseAutomationRuns,
  type AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { performanceQueryOptions } from './performance-query-options';
import { isSortedRuns, mapAutomationRuns } from '@/automations/utils/automation-runs';
import type { RunSort } from '@/automations/types';

export const useAutomationRuns = (
  automationId: string,
  status: AutomationRunStatusFilter | null,
  sort: RunSort,
  requestId: string,
) => {
  const query = useBrowseAutomationRuns(automationId, requestId, {
    ...performanceQueryOptions,
    searchParams: {
      ...(status ? { status } : {}),
      ...(sort.direction !== 'desc' ? { order: `${sort.key} ${sort.direction}` } : {}),
    },
  });
  const runs = query.data?.automation_runs;
  // An older Core ignores `order`; never present its rows under the wrong direction.
  const unsupportedSort = useMemo(
    () =>
      (!!runs && !isSortedRuns(runs, sort.direction)) ||
      (query.error instanceof APIError && query.error.response?.status === 422),
    [runs, sort.direction, query.error],
  );
  const data = useMemo(
    () => (runs && !unsupportedSort ? mapAutomationRuns(runs) : undefined),
    [runs, unsupportedSort],
  );
  const failed = !query.isFetching && query.isError;
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;
  return {
    data,
    isLoading: !data && !failed && !unsupportedSort,
    isError: failed && !unavailable && !unsupportedSort,
    unavailable,
    unsupportedSort,
    retry: () => {
      void query.refetch();
    },
  };
};
