import React from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
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
    iconBg: 'bg-state-success/15',
    iconFg: 'text-state-success',
  },
  pending: {
    Icon: InProgressGlyph,
    border: 'border-state-info border-dashed',
    iconBg: 'bg-state-info/15',
    iconFg: 'text-state-info',
  },
  planned: {
    Icon: LucideIcon.Circle,
    border: 'border-border-default',
    iconBg: 'bg-muted',
    iconFg: 'text-muted-foreground',
  },
  exited: {
    Icon: ExitedGlyph,
    border: 'border-border-strong',
    iconBg: 'bg-muted',
    iconFg: 'text-muted-foreground',
  },
  failed: {
    Icon: LucideIcon.CircleAlert,
    border: 'border-state-danger',
    iconBg: 'bg-state-danger/15',
    iconFg: 'text-state-danger',
  },
} satisfies Record<
  HistoryCardState,
  { Icon: React.ElementType; border: string; iconBg: string; iconFg: string }
>;

const kindIcons = {
  trigger: LucideIcon.Zap,
  email: LucideIcon.Mail,
  wait: LucideIcon.Hourglass,
  end: LucideIcon.LogOut,
  event: LucideIcon.LogOut,
} satisfies Record<HistoryCardData['kind'], React.ElementType>;

const HistoryTime: React.FC<{ timestamp: HistoryTimestamp }> = ({ timestamp }) => {
  const date = new Date(timestamp.value);
  if (timestamp.rangeStart) {
    const start = new Date(timestamp.rangeStart);
    const shortDate = { month: 'short', day: 'numeric' } as const;
    const fullDate = { dateStyle: 'full' } as const;
    const description = `Estimated dates: ${start.toLocaleDateString(undefined, fullDate)}–${date.toLocaleDateString(undefined, fullDate)}`;
    return (
      <span aria-label={description} title={description}>
        est.{' '}
        <time dateTime={timestamp.rangeStart}>
          {start.toLocaleDateString(undefined, shortDate)}
        </time>
        –<time dateTime={timestamp.value}>{date.toLocaleDateString(undefined, shortDate)}</time>
      </span>
    );
  }
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
export const HistoryCard: React.FC<
  React.PropsWithChildren<{
    card: HistoryCardData;
    // SHAPING PROTOTYPE ONLY: styled like the editor's cards, with the state in the icon
    // rather than a coloured border.
    editorStyle?: boolean;
  }>
> = ({ card, children, editorStyle = false }) => {
  const { Icon: StateIcon, border, iconBg, iconFg } = states[card.state];
  let Icon = StateIcon;
  if (
    card.state === 'planned' ||
    (card.state === 'exited' && card.kind !== 'event' && card.kind !== 'end')
  ) {
    Icon = kindIcons[card.kind];
  }
  return (
    <AutomationCard aria-label={card.title} className={editorStyle ? undefined : border}>
      <AutomationCardHeader
        description={
          <Text className="sr-only" size="sm" tone="secondary">
            {card.statusLabel}
          </Text>
        }
        icon={<Icon aria-hidden="true" className="size-4" />}
        iconClassName={cn(editorStyle && 'p-2.5', iconBg, iconFg)}
        metadata={
          card.timestamp && (
            <Stack className="ml-auto max-w-full text-right" gap="xs">
              {!card.timestamp.estimated && card.state === 'pending' && (
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
      {editorStyle && children ? <div className="mt-3">{children}</div> : children}
    </AutomationCard>
  );
};
