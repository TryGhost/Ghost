import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { useAutomationStatusStats } from '@/automations/hooks/use-automation-status-stats';
import { StatusCards } from './status-cards';

export const StatusCounts: React.FC<{ automationId: string }> = ({ automationId }) => {
  const { data, isLoading, isError, unavailable, retry } = useAutomationStatusStats(automationId);
  return (
    <Stack aria-label="Automation status counts" className="@container" gap="sm" role="region">
      <StatusCards data={data} isLoading={isLoading} />
      {isLoading && (
        <Text className="sr-only" role="status">
          Loading automation statuses
        </Text>
      )}
      {data?.incompleteMessage && (
        <Text role="status" size="sm" tone="secondary">
          {data.incompleteMessage}
        </Text>
      )}
      {unavailable && (
        <Text role="status" size="sm" tone="secondary">
          Status counts are unavailable on this version of Ghost.
        </Text>
      )}
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
