import React from 'react';
import { Skeleton } from '@tryghost/shade/components';
import { Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import type { AutomationStatusCardsData } from '@/automations/utils/automation-status-stats';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const cards = [
  { key: 'inProgress', label: 'In progress', Icon: InProgressGlyph, color: 'text-state-info' },
  { key: 'completed', label: 'Completed', Icon: CompletedGlyph, color: 'text-state-success' },
  { key: 'exitedEarly', label: 'Exited early', Icon: ExitedGlyph, color: 'text-muted-foreground' },
] as const;

export const StatusCards: React.FC<{ data?: AutomationStatusCardsData; isLoading: boolean }> = ({
  data,
  isLoading,
}) => (
  <Grid className="@[36rem]:grid-cols-3" gap="md">
    {cards.map(({ key, label, Icon, color }) => (
      <Stack
        key={key}
        aria-label={label}
        className="min-w-0 rounded-lg border border-border-default p-4"
        gap="xs"
        role="group"
      >
        <Inline gap="xs">
          <Icon className={color} />
          <Text as="h3" className="whitespace-nowrap" size="sm" tone="secondary">
            {label}
          </Text>
        </Inline>
        {isLoading ? (
          <Text as="div" size="2xl">
            <Skeleton className="h-[1em] w-12" />
          </Text>
        ) : (
          <Text
            aria-label={data ? undefined : 'Unavailable'}
            className="break-words tabular-nums"
            size="2xl"
            weight="semibold"
          >
            {data?.[key] ?? '—'}
          </Text>
        )}
      </Stack>
    ))}
  </Grid>
);
