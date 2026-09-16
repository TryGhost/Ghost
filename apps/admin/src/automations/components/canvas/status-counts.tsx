import React from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import type { useAutomationStatusStats } from '@/automations/hooks/use-automation-status-stats';
import { StatusCards } from './status-cards';

export const StatusCounts: React.FC<{
  compact?: boolean;
  isUpdating?: boolean;
  counts: ReturnType<typeof useAutomationStatusStats>;
  selectedStatus: AutomationRunStatusFilter | null;
  onStatusChange: (status: AutomationRunStatusFilter) => void;
}> = ({ counts, selectedStatus, onStatusChange, compact, isUpdating = false }) => {
  const { data, isLoading, isError, unavailable, retry, paused, continueSearch } = counts;
  return (
    <Stack aria-label="Automation status counts" className="@container" gap="sm" role="region">
      <StatusCards
        compact={compact}
        data={data}
        isLoading={isUpdating || isLoading}
        selectedStatus={selectedStatus}
        onStatusChange={onStatusChange}
      />
      {(isUpdating || isLoading) && (
        <Text className={!isUpdating && paused ? undefined : 'sr-only'} role="status">
          {!isUpdating && paused
            ? 'Counting paused. Continue to finish totals.'
            : 'Loading automation statuses'}
        </Text>
      )}
      {!isUpdating && paused && !isError && (
        <Button className="self-start" size="sm" variant="outline" onClick={continueSearch}>
          Continue counting
        </Button>
      )}
      {!isUpdating && data?.incompleteMessage && (
        <Text role="status" size="sm" tone="secondary">
          {data.incompleteMessage}
        </Text>
      )}
      {!isUpdating && unavailable && (
        <Text role="status" size="sm" tone="secondary">
          Status counts are unavailable on this version of Ghost.
        </Text>
      )}
      {!isUpdating && isError && (
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
