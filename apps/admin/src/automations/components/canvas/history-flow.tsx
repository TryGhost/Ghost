import React, { useMemo } from 'react';
import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { Box, Stack } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { mapRunHistory } from '@/automations/utils/run-history';
import { HistoryCard } from './history-card';
import { HistoryEmailContent } from './history-email-content';

export const HistoryFlow: React.FC<{
  history: AutomationRunHistory;
}> = ({ history }) => {
  const cards = useMemo(() => mapRunHistory(history), [history]);
  return (
    <Stack
      aria-label="Run steps"
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
          <HistoryCard card={card}>
            {card.email && <HistoryEmailContent email={card.email} />}
          </HistoryCard>
        </Stack>
      ))}
    </Stack>
  );
};
