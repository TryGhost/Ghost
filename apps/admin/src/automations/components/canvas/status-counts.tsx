import type { AutomationStatusCardsData } from '@/automations/utils/automation-status-stats';
import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import { StatusCards } from './status-cards';

export const StatusCounts: React.FC<{ data?: AutomationStatusCardsData; isLoading: boolean }> = ({
  data,
  isLoading,
}) => {
  return (
    <Stack aria-label="Automation status counts" className="@container" gap="sm" role="region">
      <StatusCards data={data} isLoading={isLoading} />
      <Text aria-atomic="true" className="sr-only" role="status">
        {isLoading
          ? 'Loading automation statuses'
          : data
            ? `Statistics loaded. ${data.inProgress} in progress, ${data.completed} completed, ${data.exitedEarly} exited early.`
            : ''}
      </Text>
    </Stack>
  );
};
