import type { AutomationEntriesChartData } from '@/automations/utils/automation-entry-stats';
import React, { useId } from 'react';
import { Skeleton } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { TotalEntriesChart } from './total-entries-chart';

export const TotalEntries: React.FC<{ chart?: AutomationEntriesChartData; isLoading: boolean }> = ({
  chart,
  isLoading,
}) => {
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
      <Text aria-atomic="true" className="sr-only" role="status">
        {isLoading ? 'Loading total entries' : chart ? `Total entries loaded: ${chart.total}.` : ''}
      </Text>
      {isLoading && (
        <Stack aria-hidden="true" gap="xs">
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
    </Stack>
  );
};
