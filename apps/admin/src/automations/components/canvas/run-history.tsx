import React, { useEffect, useRef } from 'react';
import { ErrorBoundary } from '@sentry/react';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useAutomationRunHistory } from '@/automations/hooks/use-automation-run-history';
import { HistoryFlow } from './history-flow';
import { HistoryBackground } from './history-background';

type RunHistoryProps = {
  automationId: string;
  automationSlug: string | null | undefined;
  runId: string;
  memberName?: string;
  isPerformanceOpen: boolean;
  onClose: () => void;
};

export const RunHistory: React.FC<RunHistoryProps> = (props) => (
  <ErrorBoundary
    fallback={(error) => (
      <Stack
        align="center"
        aria-label="Run history"
        className="absolute inset-0 bg-preview-canvas px-6 text-center"
        gap="sm"
        justify="center"
        role="region"
      >
        <Text role="alert">Could not load run history</Text>
        <Button
          ref={(button) => button?.focus({ preventScroll: true })}
          variant="outline"
          onClick={() => error.resetError()}
        >
          Retry
        </Button>
      </Stack>
    )}
  >
    <RunHistoryContent {...props} />
  </ErrorBoundary>
);

const RunHistoryContent: React.FC<RunHistoryProps> = ({
  automationId,
  automationSlug,
  runId,
  memberName,
  isPerformanceOpen,
  onClose,
}) => {
  const { history, summary, isLoading, isError, notFound, retry, plan } = useAutomationRunHistory(
    automationId,
    runId,
  );
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
    <Box className="absolute inset-0 bg-preview-canvas">
      <HistoryBackground />
      <Stack
        aria-label="Run history"
        className="relative h-full overflow-y-auto"
        gap="none"
        role="region"
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
            </Stack>
          )}
          {notFound && (
            <Text role="status" tone="secondary">
              Run not found
            </Text>
          )}
          {isError && (
            <Stack align="center" gap="sm" role="alert">
              <Text>Could not load run history</Text>
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
              <Text className="sr-only" role="status" tone="secondary">
                {`${formatNumber(history.steps.length)} recorded ${history.steps.length === 1 ? 'step' : 'steps'}`}
              </Text>
            </Stack>
          )}
        </Stack>
        {history && <HistoryFlow automationSlug={automationSlug} history={history} plan={plan} />}
      </Stack>
    </Box>
  );
};
