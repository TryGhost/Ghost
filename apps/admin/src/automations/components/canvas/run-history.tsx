import React, { useEffect, useRef } from 'react';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useAutomationRunHistory } from '@/automations/hooks/use-automation-run-history';
import { HistoryFlow } from './history-flow';

export const RunHistory: React.FC<{
  automationId: string;
  runId: string;
  isPerformanceOpen: boolean;
  onClose: () => void;
}> = ({ automationId, runId, isPerformanceOpen, onClose }) => {
  const { history, summary, isLoading, isError, unavailable, retry, isRefreshing, upcoming } =
    useAutomationRunHistory(automationId, runId);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  return (
    <Stack
      aria-label="Run history"
      className="absolute inset-0 overflow-y-auto bg-background"
      gap="none"
      role="region"
      style={
        history
          ? {
              backgroundImage: 'radial-gradient(var(--border-default) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }
          : undefined
      }
    >
      <Inline
        className={cn(
          'sticky top-0 z-10 min-h-16 shrink-0 bg-background p-4',
          !isPerformanceOpen && 'pl-16',
        )}
        gap="sm"
      >
        <Button
          ref={closeButton}
          aria-label="Back to editing"
          className="max-w-full min-w-0"
          title={`Run ${runId}`}
          variant="outline"
          onClick={onClose}
        >
          <LucideIcon.X aria-hidden="true" className="shrink-0" />
          <span className="truncate">{summary?.memberName ?? `Run ${runId}`}</span>
        </Button>
        {summary && (
          <Text as="span" className="shrink-0" size="sm" tone="secondary">
            <time dateTime={summary.enteredAt} title={summary.enteredDescription}>
              {summary.enteredLabel}
            </time>
          </Text>
        )}
        {history && (
          <Button
            aria-label="Refresh run history"
            className="ml-auto"
            disabled={isRefreshing}
            title="Refresh run history"
            variant="ghost"
            onClick={retry}
          >
            <LucideIcon.RefreshCw
              aria-hidden="true"
              className={isRefreshing ? 'animate-spin' : undefined}
            />
          </Button>
        )}
      </Inline>
      <Stack
        className={
          history
            ? 'mx-auto w-full max-w-[448px] px-6 text-center'
            : 'm-auto w-full max-w-md px-6 py-12 text-center'
        }
        gap="md"
      >
        {isLoading && (
          <Stack align="center" aria-label="Loading run history" gap="sm" role="status">
            <LoadingIndicator size="lg" />
            <Text tone="secondary">Loading run history</Text>
          </Stack>
        )}
        {unavailable && (
          <Text role="status" tone="secondary">
            This run is missing or its history is unavailable on this version of Ghost.
          </Text>
        )}
        {isError && (
          <Stack align="center" gap="sm" role="alert">
            <Text>Could not load run history.</Text>
            <Button variant="outline" onClick={retry}>
              Retry
            </Button>
          </Stack>
        )}
        {history && summary && (
          <Stack gap="sm">
            <Text as="h2" className="sr-only">
              {summary.statusLabel}
            </Text>
            <Text
              className={history.history_status === 'empty' ? undefined : 'sr-only'}
              role="status"
              tone="secondary"
            >
              {history.history_status === 'empty'
                ? 'No recorded steps are available for this run.'
                : `${formatNumber(history.steps.length)} recorded ${history.steps.length === 1 ? 'step' : 'steps'}`}
            </Text>
            {history.history_status === 'partial' && (
              <Text role="status" size="sm" tone="secondary">
                Some history details are unavailable.
              </Text>
            )}
            {!history.member && (
              <Text role="status" size="sm" tone="secondary">
                Member details unavailable.
              </Text>
            )}
          </Stack>
        )}
      </Stack>
      {history && <HistoryFlow history={history} upcoming={upcoming} />}
    </Stack>
  );
};
