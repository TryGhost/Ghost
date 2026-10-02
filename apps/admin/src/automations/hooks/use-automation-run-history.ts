import { useId, useMemo, useState } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useReadAutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
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
  const query = useReadAutomationRunHistory(
    automationId,
    runId,
    `${selectionId}:${generation}`,
    historyQueryOptions,
  );
  const history = query.isSuccess ? query.data?.automation_run_history[0] : undefined;
  const summary = useMemo(() => history && mapAutomationRun(history), [history]);
  const unavailable =
    query.isError && query.error instanceof APIError && query.error.response?.status === 404;
  return {
    history,
    summary,
    isLoading: query.isPending,
    isError: query.isError && !unavailable,
    unavailable,
    retry: () => setGeneration((value) => value + 1),
  };
};
