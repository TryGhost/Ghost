import { useId, useMemo, useState } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useReadAutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { historyQueryOptions } from './history-query-options';
import { mapAutomationRun } from '@/automations/utils/automation-runs';

export const useAutomationRunHistory = (automationId: string, runId: string) => {
  const selectionId = useId();
  const [generation, setGeneration] = useState(0);
  const query = useReadAutomationRunHistory(
    automationId,
    runId,
    `${selectionId}:${generation}`,
    historyQueryOptions,
  );
  const response = query.data?.automation_run_history[0];
  const wrongRun = !!response && (response.automation_id !== automationId || response.id !== runId);
  const failed = !query.isFetching && (query.isError || wrongRun);
  const history = query.isFetchedAfterMount && !failed && !wrongRun ? response : undefined;
  const summary = useMemo(() => history && mapAutomationRun(history), [history]);
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;
  return {
    history,
    summary,
    isLoading: !history && !failed,
    isError: failed && !unavailable,
    unavailable,
    retry: () => setGeneration((value) => value + 1),
  };
};
