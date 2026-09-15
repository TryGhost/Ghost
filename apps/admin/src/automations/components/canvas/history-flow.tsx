import React, { useMemo } from 'react';
import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { Button } from '@tryghost/shade/components';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { mapRunHistory } from '@/automations/utils/run-history';
import { mapUpcomingRunSteps } from '@/automations/utils/upcoming-run-steps';
import type { useAutomationRunHistory } from '@/automations/hooks/use-automation-run-history';
import { HistoryCard } from './history-card';
import { HistoryEmailContent } from './history-email-content';

export const HistoryFlow: React.FC<{
  history: AutomationRunHistory;
  upcoming: ReturnType<typeof useAutomationRunHistory>['upcoming'];
}> = ({ history, upcoming }) => {
  const { plan, isLoading, isError, retry } = upcoming;
  const planned = useMemo(() => plan && mapUpcomingRunSteps(history, plan), [history, plan]);
  const cards = useMemo(() => mapRunHistory(history, planned?.cards), [history, planned]);
  return (
    <Stack
      aria-label="Run history and upcoming steps"
      className="mx-auto w-full max-w-[448px] shrink-0 px-6 pt-4 pb-16"
      gap="none"
      role="list"
    >
      {cards.map((card, index) => (
        <Stack key={card.id} align="center" gap="none" role="listitem">
          {index > 0 && (
            <Box
              aria-hidden="true"
              className={cn(
                'h-20 border-l border-border-strong',
                (card.state !== 'occurred' || cards[index - 1].state !== 'occurred') &&
                  'border-dashed',
              )}
            />
          )}
          {index === history.steps.length + 1 &&
            history.status === 'in_progress' &&
            (isLoading || isError || planned?.message) && (
              <Stack align="center" className="mb-4 text-center" gap="sm">
                <Text role={isError ? 'alert' : 'status'} size="sm" tone="secondary">
                  {isLoading
                    ? 'Loading upcoming steps…'
                    : isError
                      ? 'Could not load upcoming steps. Recorded history is still available.'
                      : planned?.message}
                </Text>
                {isError && (
                  <Button variant="outline" onClick={retry}>
                    Retry upcoming steps
                  </Button>
                )}
              </Stack>
            )}
          <HistoryCard card={card}>
            {card.email && (
              <HistoryEmailContent email={card.email} planned={card.state === 'planned'} />
            )}
          </HistoryCard>
        </Stack>
      ))}
    </Stack>
  );
};
