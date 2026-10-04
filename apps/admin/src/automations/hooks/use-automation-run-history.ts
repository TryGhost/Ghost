import { useId, useMemo, useState } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  useReadAutomationRunHistory,
  useReadAutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { mapAutomationRun } from '@/automations/utils/automation-runs';

// Fetch on selection or retry; list controls do not refresh the selected history.
const historyQueryOptions = {
  defaultErrorHandler: false,
  staleTime: Infinity,
  gcTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;

export const useAutomationRunHistory = (automationId: string, runId: string) => {
  const selectionId = useId();
  const [generation, setGeneration] = useState(0);
  const requestId = `${selectionId}:${generation}`;
  const query = useReadAutomationRunHistory(automationId, runId, requestId, historyQueryOptions);
  const currentHistory = query.isSuccess ? query.data?.automation_run_history[0] : undefined;
  const needsPlan = currentHistory?.status === 'in_progress';
  const planQuery = useReadAutomationRunPlan(automationId, requestId, {
    ...historyQueryOptions,
    enabled: needsPlan,
  });
  const plan = planQuery.isSuccess ? planQuery.data?.automations[0] : undefined;
  const waitingForPlan = needsPlan && planQuery.isPending;
  const history = !waitingForPlan && !planQuery.isError ? currentHistory : undefined;
  const summary = useMemo(() => history && mapAutomationRun(history), [history]);
  const notFound =
    query.isError && query.error instanceof APIError && query.error.response?.status === 404;
  return {
    history,
    summary,
    isLoading: query.isPending || waitingForPlan,
    isError: (query.isError && !notFound) || (needsPlan && planQuery.isError),
    notFound,
    retry: () => setGeneration((value) => value + 1),
    plan,
  };
};
