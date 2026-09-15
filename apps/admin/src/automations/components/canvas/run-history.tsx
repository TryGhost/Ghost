import React, { useEffect, useRef } from 'react';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useAutomationRunHistory } from '@/automations/hooks/use-automation-run-history';
import { HistoryFlow } from './history-flow';

export const RunHistory: React.FC<{
  automationId: string;
  runId: string;
  memberName?: string;
  isPerformanceOpen: boolean;
  onClose: () => void;
}> = ({ automationId, runId, memberName, isPerformanceOpen, onClose }) => {
  const { history, summary, isLoading, isError, unavailable, retry, upcoming } =
    useAutomationRunHistory(automationId, runId);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!isPerformanceOpen) {
      closeButton.current?.focus({ preventScroll: true });
    }
  }, [isPerformanceOpen]);

  return (
    <Stack
      aria-label="Run history"
      className="absolute inset-0 overflow-y-auto bg-preview-canvas"
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
          'pointer-events-none sticky top-0 z-10 shrink-0 px-6 py-4',
          !isPerformanceOpen && 'pl-16',
        )}
        gap="sm"
      >
        <Button
          ref={closeButton}
          aria-label="Back to editing"
          className="pointer-events-auto h-9 max-w-full min-w-0 bg-surface-elevated"
          title={`Run ${runId}`}
          variant="outline"
          onClick={onClose}
        >
          <LucideIcon.X aria-hidden="true" className="shrink-0" />
          <span className="truncate">{summary?.memberName ?? memberName ?? 'Member'}</span>
        </Button>
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
