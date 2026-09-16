import React, { useId } from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { cn } from '@tryghost/shade/utils';
import { Skeleton } from '@tryghost/shade/components';
import { Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import type { AutomationStatusCardsData } from '@/automations/utils/automation-status-stats';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const cards = [
  {
    key: 'inProgress',
    status: 'in_progress',
    label: 'In progress',
    Icon: InProgressGlyph,
    color: 'text-state-info',
  },
  {
    key: 'completed',
    status: 'completed',
    label: 'Completed',
    Icon: CompletedGlyph,
    color: 'text-state-success',
  },
  {
    key: 'exitedEarly',
    status: 'exited_early',
    label: 'Exited early',
    Icon: ExitedGlyph,
    color: 'text-muted-foreground',
  },
] as const;

export const StatusCards: React.FC<{
  data?: AutomationStatusCardsData;
  isLoading: boolean;
  compact?: boolean;
  selectedStatus: AutomationRunStatusFilter | null;
  onStatusChange: (status: AutomationRunStatusFilter) => void;
}> = ({ data, isLoading, selectedStatus, onStatusChange, compact = false }) => {
  const countId = useId();
  const CardLayout = compact ? Inline : Stack;
  return (
    <Grid className={compact ? 'grid-cols-3' : '@[36rem]:grid-cols-3'} gap="md">
      {cards.map(({ key, status, label, Icon, color }) => (
        <button
          key={key}
          aria-describedby={`${countId}-${key}`}
          aria-label={label}
          aria-pressed={selectedStatus === status}
          className={cn(
            'min-w-0 cursor-pointer rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            compact ? 'p-2' : 'p-3',
            selectedStatus === status
              ? 'border-foreground bg-muted-foreground/10'
              : 'border-border-default hover:bg-interactive-hover',
          )}
          type="button"
          onClick={() => onStatusChange(status)}
        >
          <CardLayout gap="xs" justify={compact ? 'center' : undefined}>
            <Inline gap="xs">
              <Icon className={color} />
              <Text
                as="span"
                className={compact ? 'sr-only' : 'whitespace-nowrap'}
                size="sm"
                tone="secondary"
              >
                {label}
              </Text>
            </Inline>
            {isLoading ? (
              <Text
                aria-label="Loading"
                as="div"
                id={`${countId}-${key}`}
                size={compact ? 'sm' : '2xl'}
              >
                <Skeleton className="h-[1em] w-12" />
              </Text>
            ) : (
              <Text
                aria-label={data ? undefined : 'Unavailable'}
                className="break-words tabular-nums"
                id={`${countId}-${key}`}
                size={compact ? 'sm' : '2xl'}
                weight="semibold"
              >
                {data?.[key] ?? '—'}
              </Text>
            )}
          </CardLayout>
        </button>
      ))}
    </Grid>
  );
};
