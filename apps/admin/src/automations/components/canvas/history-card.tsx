import React from 'react';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import type { HistoryCardData, HistoryCardState } from '@/automations/utils/run-history';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const states = {
  occurred: {
    Icon: CompletedGlyph,
    border: 'border-state-success',
    icon: 'bg-state-success/15 text-state-success',
  },
  pending: {
    Icon: InProgressGlyph,
    border: 'border-state-info border-dashed',
    icon: 'bg-state-info/15 text-state-info',
  },
  planned: {
    Icon: LucideIcon.Circle,
    border: 'border-border-default',
    icon: 'bg-muted text-muted-foreground',
  },
  exited: {
    Icon: ExitedGlyph,
    border: 'border-border-strong',
    icon: 'bg-muted text-muted-foreground',
  },
  unknown: {
    Icon: LucideIcon.CircleHelp,
    border: 'border-border-default border-dashed',
    icon: 'bg-muted text-muted-foreground',
  },
} satisfies Record<HistoryCardState, { Icon: React.ElementType; border: string; icon: string }>;

// Content and state are composed separately so future email content and editing
// controls can use the same card surface without bringing editor state into it.
export const HistoryCard: React.FC<React.PropsWithChildren<{ card: HistoryCardData }>> = ({
  card,
  children,
}) => {
  const { Icon: StateIcon, border, icon } = states[card.state];
  const Icon =
    card.state === 'planned'
      ? card.kind === 'email'
        ? LucideIcon.Mail
        : card.kind === 'wait'
          ? LucideIcon.Hourglass
          : LucideIcon.LogOut
      : StateIcon;
  const date = card.timestamp && new Date(card.timestamp.value);
  const fullDate = date?.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' });
  const timestampDescription =
    card.timestamp &&
    [
      `${card.timestamp.label}: ${fullDate}`,
      card.timestamp.related &&
        `${card.timestamp.related.label}: ${new Date(card.timestamp.related.value).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })}`,
    ]
      .filter(Boolean)
      .join('. ');
  return (
    <Stack
      aria-label={card.title}
      className={cn(
        'w-full rounded-xl border bg-surface-elevated p-6 text-foreground shadow-sm',
        border,
      )}
      gap="md"
      role="article"
    >
      <Inline gap="md">
        <Box aria-hidden="true" className={cn('shrink-0 rounded-md p-3', icon)}>
          <Icon aria-hidden="true" className="size-4" />
        </Box>
        <Stack className="min-w-0 flex-1" gap="xs">
          <Text as="h3" size="md" weight="medium">
            {card.title}
          </Text>
          {
            <Text
              className={
                card.state === 'unknown' || card.state === 'exited' ? undefined : 'sr-only'
              }
              size="sm"
              tone="secondary"
            >
              {card.statusLabel}
            </Text>
          }
        </Stack>
        {card.timestamp && (
          <Stack className="shrink-0 text-right" gap="xs">
            {(card.state === 'pending' || card.state === 'planned') && (
              <Text size="sm" tone="secondary">
                {card.timestamp.label}
              </Text>
            )}
            <Text as="span" size="sm" tone="secondary">
              <time
                aria-label={timestampDescription}
                dateTime={card.timestamp.value}
                title={timestampDescription}
              >
                {date?.toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
            </Text>
          </Stack>
        )}
      </Inline>
      {card.executionTimestamp && (
        <Text size="sm" tone="secondary">
          {card.executionTimestamp.label}{' '}
          <time dateTime={card.executionTimestamp.value}>
            {new Date(card.executionTimestamp.value).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
        </Text>
      )}
      {children}
      {card.details.map((detail) => (
        <Text key={detail} size="sm" tone="secondary">
          {detail}
        </Text>
      ))}
    </Stack>
  );
};
