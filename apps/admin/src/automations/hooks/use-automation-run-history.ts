import { useId, useMemo, useState } from 'react';
import { APIError } from '@tryghost/admin-x-framework/errors';
import {
  useReadAutomationRunHistory,
  useReadAutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { historyQueryOptions } from './history-query-options';
import { mapAutomationRuns } from '@/automations/utils/automation-runs';

export const useAutomationRunHistory = (automationId: string, runId: string) => {
  const selectionId = useId();
  const [generation, setGeneration] = useState(0);
  const requestId = `${selectionId}:${generation}`;
  const query = useReadAutomationRunHistory(automationId, runId, requestId, historyQueryOptions);
  const response = query.data?.automation_run_history[0];
  const wrongRun = !!response && (response.automation_id !== automationId || response.id !== runId);
  const failed = !query.isFetching && (query.isError || wrongRun);
  const currentHistory = query.isFetchedAfterMount && !failed && !wrongRun ? response : undefined;
  const needsPlan = currentHistory?.status === 'in_progress';
  const planQuery = useReadAutomationRunPlan(automationId, requestId, {
    ...historyQueryOptions,
    enabled: needsPlan,
  });
  const plan = planQuery.data?.automations[0];
  const planFailed =
    !planQuery.isFetching && (planQuery.isError || (!!plan && plan.id !== automationId));
  const waitingForPlan =
    needsPlan && !planFailed && (!planQuery.isFetchedAfterMount || planQuery.isFetching);
  const settled = !!currentHistory && !waitingForPlan;
  const current = settled
    ? { history: currentHistory, plan: needsPlan && !planFailed ? plan : undefined, planFailed }
    : undefined;
  const [previous, setPrevious] = useState(current);
  // Publish history and its saved graph together on refresh. Retain the previous
  // view while either request is pending, without reusing another run's data.
  if (
    current &&
    (current.history !== previous?.history ||
      current.plan !== previous?.plan ||
      current.planFailed !== previous?.planFailed)
  ) {
    setPrevious(current);
  }
  const snapshot = current ?? previous;
  const history = snapshot?.history ?? currentHistory;
  const summary = useMemo(() => history && mapAutomationRuns([history])[0], [history]);
  const unavailable =
    failed && query.error instanceof APIError && query.error.response?.status === 404;
  const retry = () => setGeneration((value) => value + 1);
  return {
    history,
    summary,
    isLoading: !history && !failed,
    isRefreshing: query.isFetching || waitingForPlan,
    isError: failed && !unavailable,
    unavailable,
    retry,
    upcoming: {
      plan: snapshot?.plan,
      isLoading: !snapshot && waitingForPlan,
      isError: snapshot?.planFailed ?? false,
      retry,
    },
  };
};
