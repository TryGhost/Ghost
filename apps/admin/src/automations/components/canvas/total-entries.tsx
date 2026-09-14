import React, { useId } from 'react';
import { Button, Skeleton } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useAutomationEntryStats } from '@/automations/hooks/use-automation-entry-stats';
import { TotalEntriesChart } from './total-entries-chart';

export const TotalEntries: React.FC<{ automationId: string }> = ({ automationId }) => {
  const { chart, isLoading, isError, unavailable, retry } = useAutomationEntryStats(automationId);
  const headingId = useId();

  return (
    <Stack
      aria-labelledby={headingId}
      className="rounded-lg border border-border-default p-4"
      gap="xs"
      role="region"
    >
      <Inline gap="xs">
        <LucideIcon.User className="size-3.5 text-muted-foreground" />
        <Text as="h3" id={headingId} size="sm" tone="secondary">
          Total entries
        </Text>
      </Inline>
      {isLoading && (
        <Stack aria-label="Loading total entries" gap="xs" role="status">
          <Text as="div" size="2xl">
            <Skeleton className="h-[1em] w-20" />
          </Text>
          <Skeleton
            className="h-[180px] w-full"
            containerClassName="block h-[180px] leading-none"
          />
        </Stack>
      )}
      {chart && <TotalEntriesChart data={chart} />}
      {unavailable && (
        <Text className="py-6" role="status" size="sm" tone="secondary">
          All-time entry analytics are unavailable on this version of Ghost.
        </Text>
      )}
      {isError && (
        <Stack className="py-3" gap="sm" role="alert">
          <Text size="sm" tone="secondary">
            Could not load entries.
          </Text>
          <Button className="self-start" size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
