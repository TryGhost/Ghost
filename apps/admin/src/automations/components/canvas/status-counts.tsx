import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { useAutomationStatusStats } from '@/automations/hooks/use-automation-status-stats';
import { StatusCards } from './status-cards';

export const StatusCounts: React.FC<{ automationId: string }> = ({ automationId }) => {
  const { data, isLoading, isError, retry } = useAutomationStatusStats(automationId);
  return (
    <Stack aria-label="Automation status counts" className="@container" gap="sm" role="region">
      <StatusCards data={data} isLoading={isLoading} />
      <Text aria-atomic="true" className="sr-only" role="status">
        {isLoading
          ? 'Loading automation statuses'
          : !isError && data
            ? `Statistics loaded. ${data.inProgress} in progress, ${data.completed} completed, ${data.exitedEarly} exited early.`
            : ''}
      </Text>
      {isError && (
        <Stack gap="sm" role="alert">
          <Text size="sm" tone="secondary">
            Could not load status counts.
          </Text>
          <Button className="self-start" size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
