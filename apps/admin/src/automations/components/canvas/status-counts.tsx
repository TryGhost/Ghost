import React from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import type { useAutomationStatusStats } from '@/automations/hooks/use-automation-status-stats';
import { StatusCards } from './status-cards';

export const StatusCounts: React.FC<{
  compact?: boolean;
  counts: ReturnType<typeof useAutomationStatusStats>;
  selectedStatus: AutomationRunStatusFilter | null;
  onStatusChange: (status: AutomationRunStatusFilter) => void;
}> = ({ counts, selectedStatus, onStatusChange, compact }) => {
  const { data, isLoading, isError, unavailable, retry, scanning, paused, continueSearch } = counts;
  return (
    <Stack aria-label="Automation status counts" className="@container" gap="sm" role="region">
      <StatusCards
        compact={compact}
        data={data}
        isLoading={isLoading}
        selectedStatus={selectedStatus}
        onStatusChange={onStatusChange}
      />
      {isLoading && (
        <Text className={scanning ? undefined : 'sr-only'} role="status">
          {paused
            ? 'Counting paused. Continue to finish totals.'
            : scanning
              ? 'Counting matching entries…'
              : 'Loading automation statuses'}
        </Text>
      )}
      {paused && !isError && (
        <Button className="self-start" size="sm" variant="outline" onClick={continueSearch}>
          Continue counting
        </Button>
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
