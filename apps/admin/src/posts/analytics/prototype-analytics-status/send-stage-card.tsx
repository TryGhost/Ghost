// PROTOTYPE ONLY — not production code. See ./README.md
//
// Variant C — one step, counted once.
//
//   Sending emails · 31,500 of 87,420
//   [============================······]
//   Delivered    Bounced
//
// It used to be two steps, sending and then collecting analytics, each with its
// own caption, clock, bar and figures. That made the card report two processes
// where B reports one, and it split the numbers across a boundary the publisher
// has no model for: "X of Y handed over" on the left, "X delivered, Y bounced"
// on the right, with no arithmetic connecting them. The second step's figures
// were even pinned to zero until the first closed, which said "nothing has
// arrived" when it only meant "this half has not opened".
//
// So it works the way B does. Sending runs from the first batch to the last
// result, because an email that has left but not arrived has no outcome yet.
// The sent count rides in the caption, the way it does on B's status line, so
// the two big figures below are the two things still moving. Sent is a fact
// about the list that stops changing early and is already drawn on the bar;
// giving it equal weight beside Delivered and Bounced made the row read as
// three live metrics when only two of them ever move.
//
// The bar is that same list, once, at full width, and it draws the caption's
// own number: green is sent, red could not be, grey has not gone yet. It has to
// be the sending figure and not the outcome figures, because the caption right
// above it reads "31,500 of 87,420" — a bar filled to 17% under a line that
// says 36% is two sources contradicting each other about one send.
//
// Delivered and bounced are what came back OF that fill, which is a different
// denominator, and they get the two figures below rather than a second track.
//
// A caption is the state, and the moment it turned once there is one. Sending
// carries no clock: a start time is not a moment anything turned, and the one
// thing a reader watching a send in progress is not waiting to be told is when
// it began. "Sending emails · 31,500 of 87,420" becomes "All emails sent ·
// Finished at 11:57" — the clock arrives with the state that earned it.
//
// It does not retire. B's log stays on the page once the send has settled, and
// so does this: the last state — all sent, with the final delivered and bounced
// against it — is the one a publisher comes back for, and a card that deletes
// itself at the moment its numbers become final answers "how did the send go?"
// with nothing. What made a permanent tracker furniture was that it kept
// claiming to be in progress; one that reaches a settled state and holds it is
// a record, not a spinner.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@tryghost/shade/components';
import AnimatedEllipsis from './animated-ellipsis';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { formatClock } from './status-copy';
import { useStatusCopy } from './use-status-copy';
import { ENGINEERS_NOTIFIED } from './types';
import type { AnalyticsStatus } from './types';

/** B's row states, minus the one a single always-started step cannot be in. */
type StepState = 'past' | 'active' | 'problem';

interface Segment {
  key: string;
  fraction: number;
  className: string;
}

/**
 * One metric, laid out the way the Growth card lays its own out: small label,
 * large figure, nothing trailing it.
 */
interface Figure {
  label: string;
  value: number;
}

interface Step {
  state: StepState;
  /** Names the state, in the same words B's status line uses. */
  caption: string;
  /** The moment that state turned, where one has been reached. */
  detail?: string;
  figures: Figure[];
  segments: Segment[];
}

/**
 * The list, once, at full width. Its length is everyone the post was addressed
 * to and its fill is how far the send has got through them, so the grey
 * remainder always means one thing: not sent yet.
 */
const StepRail: React.FC<{ segments: Segment[] }> = ({ segments }) => (
  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
    {segments.map((segment) => (
      <div
        key={segment.key}
        className={segment.className}
        style={{ width: `${Math.max(0, Math.min(1, segment.fraction)) * 100}%` }}
      />
    ))}
  </div>
);

const buildStep = ({ send, counting }: AnalyticsStatus, timezone: string): Step => {
  const at = (date: Date) => formatClock(date, timezone);
  const total = send.recipientCount;
  const share = (count: number) => (total > 0 ? count / total : 0);

  // The two outcomes, reported as they stand, zeros included: a zero here is a
  // count sitting under a bar that is visibly mostly grey, which is a different
  // thing from a sentence announcing that nothing has arrived.
  const figures: Figure[] = [
    { label: 'Delivered', value: counting.deliveredCount },
    { label: 'Bounced', value: counting.bouncedCount },
  ];

  // Stated only where the caption does not already say it. Beside "All emails
  // sent" it would be 87,420 of 87,420, and beside "Emails failed to send" it
  // would be a zero — both making the reader check a number to learn what the
  // words in front of it just told them.
  // Sent is what has landed, so the caption's number and the bar's fill are
  // both delivered plus bounced — the same pair the figures below spell out.
  const settledCount = counting.deliveredCount + counting.bouncedCount;
  const sentOfTotal = `${formatNumber(settledCount)} of ${formatNumber(total)}`;

  // The shortfall between the list and what was reached only means "could not
  // be sent" once the send is over. While it is running the same subtraction is
  // just the queue — emails whose turn has not come — and painting those red
  // reported 55,920 failures on a send in which nothing had gone wrong. They
  // belong in the grey remainder with everything else Ghost has no answer for.
  const rejected = send.finishedAt ? send.recipientCount - send.reachedCount : 0;

  const segments: Segment[] = [
    { key: 'delivered', fraction: share(counting.deliveredCount), className: 'bg-state-success' },
    { key: 'bounced', fraction: share(counting.bouncedCount), className: 'bg-state-danger' },
    { key: 'rejected', fraction: share(rejected), className: 'bg-state-danger' },
  ];

  if (send.state === 'preparing') {
    return { state: 'active', caption: 'Preparing to send emails', figures, segments: [] };
  }

  if (send.state === 'failed') {
    return {
      state: 'problem',
      caption: 'Emails failed to send',
      detail: send.finishedAt
        ? `Stopped at ${at(send.finishedAt)}. ${ENGINEERS_NOTIFIED}`
        : ENGINEERS_NOTIFIED,
      figures,
      segments,
    };
  }

  if (send.state === 'partiallyFailed') {
    return {
      state: 'problem',
      caption: 'Some emails failed to send',
      detail: send.finishedAt
        ? `${sentOfTotal} · Finished at ${at(send.finishedAt)}. ${ENGINEERS_NOTIFIED}`
        : `${sentOfTotal}. ${ENGINEERS_NOTIFIED}`,
      figures,
      segments,
    };
  }

  // Sending is over when the last result comes back, not when the last batch
  // goes out — the same line B draws.
  const outstanding = send.reachedCount - counting.deliveredCount - counting.bouncedCount;
  if (counting.countedThrough && send.reachedCount > 0 && outstanding <= 0) {
    return {
      state: 'past',
      caption: `All ${formatNumber(total)} emails sent`,
      detail: `Finished at ${at(counting.countedThrough)}`,
      figures,
      segments,
    };
  }

  return {
    state: 'active',
    caption: `Sending ${formatNumber(total)} emails`,
    // Not `sentOfTotal` here: the caption already states the total, and repeating it
    // two words later would have the line say 87,420 twice.
    detail: `${formatNumber(settledCount)} sent`,
    figures,
    segments,
  };
};

const SendStageCard: React.FC<{ fullWidth?: boolean }> = ({ fullWidth }) => {
  const resolved = useStatusCopy();
  const { settings } = useAnalyticsData();

  if (!resolved || resolved.variant !== 'stageCard') {
    return null;
  }

  const step = buildStep(resolved.status, getSiteTimezone(settings));
  const isPreparing = resolved.status.send.state === 'preparing';

  return (
    <Card className={`overflow-hidden p-0 ${fullWidth ? 'col-span-2' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-lg">
          <LucideIcon.Mail size={16} strokeWidth={1.5} />
          Newsletter progress
        </CardTitle>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <Stack gap="none">
          <Text size="sm">
            <Text
              as="strong"
              className={step.state === 'problem' ? 'text-destructive' : ''}
              size="sm"
              weight="semibold"
            >
              {step.caption}
              {isPreparing && <AnimatedEllipsis />}
            </Text>
            {step.detail && (
              <Text as="span" size="sm" tone="secondary">
                {` · ${step.detail}`}
              </Text>
            )}
          </Text>

          <div className="mt-2.5">
            <StepRail segments={step.segments} />
          </div>

          {/* Label over figure, the same way the Growth card stacks its own.
              Wraps rather than shrinks, so the three drop onto a second line in
              a half-width card instead of colliding. */}
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
            {step.figures.map((figure) => (
              <Stack key={figure.label} gap="none">
                <Text className="text-base font-medium" tone="secondary">
                  {figure.label}
                </Text>
                <span className="mt-0.5 text-[26px] leading-none font-semibold tracking-tighter text-foreground tabular-nums">
                  {formatNumber(figure.value)}
                </span>
              </Stack>
            ))}
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SendStageCard;
