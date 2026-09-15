import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import type {
  HistoryCardData,
  HistoryCardState,
  HistoryTimestamp,
} from '@/automations/utils/run-history';
import { AutomationCard, AutomationCardHeader } from './automation-card';
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
  failed: {
    Icon: LucideIcon.CircleAlert,
    border: 'border-state-danger',
    icon: 'bg-state-danger/15 text-state-danger',
  },
  unknown: {
    Icon: LucideIcon.CircleHelp,
    border: 'border-border-default border-dashed',
    icon: 'bg-muted text-muted-foreground',
  },
} satisfies Record<HistoryCardState, { Icon: React.ElementType; border: string; icon: string }>;

const HistoryTime: React.FC<{ timestamp: HistoryTimestamp }> = ({ timestamp }) => {
  const date = new Date(timestamp.value);
  const fullDate = date.toLocaleString(undefined, {
    dateStyle: 'full',
    ...(timestamp.estimated ? {} : { timeStyle: 'long' }),
  });
  const description = [
    `${timestamp.label === 'est.' ? 'Estimated date' : timestamp.label}: ${fullDate}`,
    timestamp.related &&
      `${timestamp.related.label}: ${new Date(timestamp.related.value).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })}`,
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <time aria-label={description} dateTime={timestamp.value} title={description}>
      {timestamp.estimated && `${timestamp.label} `}
      {date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(timestamp.estimated ? {} : { hour: 'numeric', minute: '2-digit' }),
      })}
    </time>
  );
};

// Content and state are composed separately so future email content and editing
// controls can use the same card surface without bringing editor state into it.
export const HistoryCard: React.FC<React.PropsWithChildren<{ card: HistoryCardData }>> = ({
  card,
  children,
}) => {
  const { Icon: StateIcon, border, icon } = states[card.state];
  const Icon =
    card.state === 'planned' ||
    (card.state === 'exited' && card.kind !== 'event' && card.kind !== 'end')
      ? card.kind === 'email'
        ? LucideIcon.Mail
        : card.kind === 'wait'
          ? LucideIcon.Hourglass
          : LucideIcon.LogOut
      : StateIcon;
  return (
    <AutomationCard aria-label={card.title} className={border}>
      <AutomationCardHeader
        description={
          <Text
            className={card.state === 'unknown' ? undefined : 'sr-only'}
            size="sm"
            tone="secondary"
          >
            {card.statusLabel}
          </Text>
        }
        icon={<Icon aria-hidden="true" className="size-4" />}
        iconClassName={icon}
        metadata={
          card.timestamp && (
            <Stack className="ml-auto max-w-full text-right" gap="xs">
              {!card.timestamp.estimated &&
                (card.state === 'pending' || card.state === 'planned') && (
                  <Text size="sm" tone="secondary">
                    {card.timestamp.label}
                  </Text>
                )}
              <Text as="span" size="sm" tone="secondary">
                <HistoryTime timestamp={card.timestamp} />
              </Text>
            </Stack>
          )
        }
        title={card.title}
      />
      {card.executionTimestamp && (
        <Text size="sm" tone="secondary">
          {!card.executionTimestamp.estimated && `${card.executionTimestamp.label} `}
          <HistoryTime timestamp={card.executionTimestamp} />
        </Text>
      )}
      {children}
      {card.details.map((detail) => (
        <Text key={detail} size="sm" tone="secondary">
          {detail}
        </Text>
      ))}
    </AutomationCard>
  );
};
