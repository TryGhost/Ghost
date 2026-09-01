// PROTOTYPE ONLY — not production code. See ./README.md
//
// Variants A, C and D — one quiet line, which A expands to a timestamped trail.
//
// A and C are the same component on purpose. C is A with the disclosure removed
// and nothing else changed, so putting them side by side asks exactly one
// question — is the trail worth the control that opens it — rather than
// comparing two lines that also happen to differ in wording or spacing.
//
// D changes the subject rather than the chrome. A and C narrate the whole
// lifecycle in one place, sending and its outcomes together, and so they have
// to live forever: a line that has taken on delivered and bounced can never
// stop, because those numbers never stop. D gives the line one job — did the
// emails go out — which is a job that finishes, so the card can finish with it.
// What it hands back in exchange is the outcome reporting, which moves down to
// the figures that were always going to carry it.
//
// A and B both answer "what is true right now". This answers "what happened,
// and when" — which is the question actually being asked in the project brief,
// where Isaac wonders whether there is "some kind of send audit you guys could
// perform". Their whole ritual is checking the clock: did it send, has data
// started, how long has it been. A trail hands them that directly, and gives
// them something to point at when they escalate instead of describing it.
//
// It differs from the other two in kind, not just placement:
//
//   - Temporal, not a snapshot. Every logged event carries a real clock time,
//     so it says how long each step took rather than only where things stand.
//   - Progressive. Collapsed it is one line, so it can persist without becoming
//     the furniture a permanent banner turns into; the depth is there when
//     somebody is worried and absent when they are not.
//   - Cumulative. Rows only get added, so the same surface serves the anxious
//     first ten minutes and the post-mortem a week later.
//
// The two halves have different jobs and no longer overlap: the collapsed line
// is the live figure — the only thing here that moves while you watch it — and
// the expanded trail is the log, timestamps and settled facts, nothing that
// ticks. Running counts used to appear in both, in two different phrasings, so
// the reader had to reconcile them and the log read as a second dashboard.
//
// Every timestamp maps to something Ghost already stores: `emails.submitted_at`,
// `MAX(email_batches.updated_at)`, and the analytics cursor from
// GET /emails/:id/analytics, which is when the last email resolved.

import React, { useState } from 'react';
import { Button } from '@tryghost/shade/components';
import AnimatedEllipsis from './animated-ellipsis';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { formatClock } from './status-copy';
import { ENGINEERS_NOTIFIED, isSendComplete, isSendFullyAccountedFor } from './types';
import { useStatusCopy } from './use-status-copy';
import type { AnalyticsStatus } from './types';

/**
 * The log only knows about things that have happened and things that have not.
 * There is deliberately no "happening now": that is the collapsed line's job,
 * and a live row here would be the same fact told twice in two tenses.
 */
type RowState =
  /** Done, and has a time to prove it. */
  | 'past'
  /** Not reached, so no time and a dotted approach. */
  | 'pending'
  | 'problem';

interface LogRow {
  at: Date | null;
  label: string;
  detail?: string;
  state: RowState;
}

const STYLE_ID = 'ghost-proto-status-glyph';
const RISE_ID = 'ghost-proto-arrow-rise';
// The arrow travels the full height of its clip circle and loops, so it reads as
// something being pushed out repeatedly rather than a spinner going nowhere.
const GLYPH_KEYFRAMES = `
@keyframes ${RISE_ID} {
  from { transform: translateY(115%); }
  to   { transform: translateY(-115%); }
}
.${RISE_ID} { animation: ${RISE_ID} 1200ms linear infinite; }
`;

/**
 * A white semicircle sitting on the grey disc, and the only glyph here that
 * does not move.
 *
 * No ring of its own. Drawing one put a white outline around the shape, and the
 * unfilled half of that outline framed a patch of disc — so the glyph read as a
 * grey semicircle with a white border, competing with the disc it sits on,
 * rather than as one mark on one field. The disc is already a circle; the glyph
 * only has to be the half.
 *
 * Stillness is the point. Every animation tried here implied a rate — a spinner
 * turning at some speed, pieces arriving at some tempo — and preparing a send
 * has none to imply: it takes as long as building a recipient list takes, and
 * a moving mark invites the reader to time it. A half-filled vessel says
 * "partway, and holding" without claiming to know how far.
 */
const HalfFullGlyph: React.FC<{ className?: string; size?: number }> = ({
  className,
  size = 12,
}) => (
  <svg className={className} fill="none" height={size} viewBox="0 0 12 12" width={size}>
    {/* Radius 4.8 in a 12 box: just over a unit of disc showing, rather than
        two. At 4 the mark sat in the middle of a grey field and read as small
        and lost; this fills the disc the way the arrow and the check do, so
        the four states carry the same visual weight.

        The flat edge sits on the diameter and the curve rises from it, which
        puts the mark in the top half — centring its bounding box instead
        dropped it to the middle and lost the "half of a circle" reading.

        Sweep flag 1 runs left-to-right clockwise, which in SVG's y-down space
        curves over the top. */}
    <path d="M1.2 6 A4.8 4.8 0 0 1 10.8 6 Z" fill="currentColor" />
  </svg>
);

// Injected by hand: a <style> element rendered in JSX lands in the DOM but its
// rules never reach the CSSOM, so the keyframes would not exist.
const ensureGlyphStylesheet = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    // Refreshed rather than skipped: an element left over from a previous load
    // would otherwise pin the old rules and silently drop any new animation.
    if (existing.textContent !== GLYPH_KEYFRAMES) {
      existing.textContent = GLYPH_KEYFRAMES;
    }
    return;
  }
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = GLYPH_KEYFRAMES;
  document.head.appendChild(tag);
};

/** Colour says what kind of state it is, and matches the dots in the trail. */
type GlyphTone = 'waiting' | 'live' | 'done' | 'problem';

const TONE_CLASS: Record<GlyphTone, string> = {
  // Grey, because nothing has happened yet. Blue is for a send in motion, and
  // preparation is Ghost getting ready to move rather than moving.
  waiting: 'bg-muted-foreground ring-muted-foreground',
  live: 'bg-state-info ring-state-info',
  done: 'bg-state-success ring-state-success',
  problem: 'bg-state-danger ring-state-danger',
};

interface GlyphSpec {
  Icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  tone: GlyphTone;
  /** Absent for the two settled states, which is the point: stillness is done. */
  motion?: string;
}

/**
 * Mirrors `buildStatus` branch for branch. The mark sits immediately beside that
 * label, so the two deciding independently is the one way this can go visibly
 * wrong — a green check next to "Send failed" is worse than no mark at all.
 *
 * Motion carries what colour cannot: the arrow runs for as long as the send is
 * unresolved and stops when every email has an answer. There is only ever the
 * one moving mark, because from the publisher's side there is only one thing
 * in flight — the wait on the last bounce report is the same wait as the wait
 * on the last batch, just a slower part of it.
 */
const glyphFor = (status: AnalyticsStatus): GlyphSpec => {
  // A spinner, and the one place one is honest: there is no progress to report
  // against, so a bar or a count would have to invent a denominator. Everything
  // after this point has real quantities and gets the arrow instead.
  //
  if (status.send.state === 'preparing') {
    return { Icon: HalfFullGlyph, tone: 'waiting' };
  }

  // A partial failure is a failure on this line: some of the list never got the
  // post, and that is the fact worth a red mark. The trail below it still tells
  // the fuller story of what did go out and what came back.
  if (status.send.state === 'failed' || status.send.state === 'partiallyFailed') {
    return { Icon: LucideIcon.X, tone: 'problem' };
  }
  // Every email now has an outcome against it, so the send is over and nothing
  // about it will change again.
  if (isSendFullyAccountedFor(status)) {
    return { Icon: LucideIcon.Check, tone: 'done' };
  }
  return { Icon: LucideIcon.ArrowUp, tone: 'live', motion: RISE_ID };
};

/** Disc, concentric ring, and a white mark — moving, or held still once done. */
const StatusGlyph: React.FC<{ status: AnalyticsStatus }> = ({ status }) => {
  ensureGlyphStylesheet();
  const { Icon, tone, motion } = glyphFor(status);

  return (
    <span
      className={`relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full text-white ring-1 ring-offset-1 ring-offset-background ${TONE_CLASS[tone]}`}
    >
      <Icon className={motion} size={12} strokeWidth={2.5} />
    </span>
  );
};

/** A 1px vertical rail, dotted when it leads to something that has not begun. */
const railClass = (isDotted: boolean): string =>
  isDotted ? 'w-0 border-l border-dotted border-border-default' : 'w-px bg-border-default';

/**
 * The log is what happened, not what is happening. Every row is either a
 * settled event with a clock time or a milestone not yet reached; nothing in
 * here changes while you watch it. The live figures live one line up.
 *
 * Sending started, first email sent, all emails sent. One verb the whole way
 * down, because an email is sending until its result comes back and sent once
 * it has arrived — so "sent" names an arrival at every scale, one email or the
 * whole list. Delivery and bounce are the send's own outcomes rather than a
 * separate reporting job, so there is no analytics step in the story and
 * nothing to follow but the send.
 *
 * The middle row earns its place on that reading. `MIN(delivered_at)` is a
 * different instant from either neighbour, needs no knowledge of Ghost's
 * internals, and answers the question people actually open this for: has
 * anything actually arrived. Called "first email delivered" it would introduce
 * a second word for the thing the other two rows call sent; called "first email
 * sent" while sent meant dispatched, it would have been the same instant as the
 * row above it. It only works because the vocabulary settled first.
 *
 * What is NOT here is the moment the last batch goes out. "All emails on their
 * way" and "all emails sent" are the same sentence to anyone who does not know
 * how Ghost hands mail off, so meeting both an hour apart teaches nothing and
 * leaves the reader wondering what the difference is — the exact question this
 * surface exists to stop being asked. Nor is there a row for sending itself:
 * that is a state, not an event, it starts at the same instant as the row above
 * it, and it says the same thing as the unreached row below it in a different
 * tense. Where the send has got to is the collapsed line's job.
 */
const buildRows = ({ send, counting }: AnalyticsStatus): LogRow[] => {
  const total = formatNumber(send.recipientCount);

  // Nothing has happened yet, so every milestone is one not yet reached. The
  // log is at its emptiest here and that is correct: it records events, and
  // there have not been any.
  if (send.state === 'preparing') {
    return [
      { at: null, label: 'Sending started', state: 'pending' },
      { at: null, label: 'First email sent', state: 'pending' },
      { at: null, label: 'All emails sent', state: 'pending' },
    ];
  }

  const rows: LogRow[] = [
    { at: send.startedAt, label: 'Sending started', detail: `${total} recipients`, state: 'past' },
  ];

  if (send.state === 'failed' && send.finishedAt) {
    rows.push({
      at: send.finishedAt,
      label: 'Emails failed to send',
      detail: `None of the ${total} could be sent`,
      state: 'problem',
    });
    // Nothing was handed over, so nothing can come back: no outcome to wait on.
    return rows;
  }

  // A partial failure is worth its own row: it is a distinct thing that
  // happened, at a time, and the reader will want to point at it.
  if (send.state === 'partiallyFailed' && send.finishedAt) {
    rows.push({
      at: send.finishedAt,
      label: 'Some emails failed to send',
      detail: `${formatNumber(send.reachedCount)} sent, ${formatNumber(send.recipientCount - send.reachedCount)} could not be`,
      state: 'problem',
    });
  }

  rows.push(
    counting.firstDeliveryAt
      ? { at: counting.firstDeliveryAt, label: 'First email sent', state: 'past' }
      : { at: null, label: 'First email sent', state: 'pending' },
  );

  // The row the send actually ends on: every email has an outcome, so there is
  // nothing left in flight. Until then it is a milestone not yet reached —
  // hollow, no time, no running tally of how close it is getting. Its wording
  // matches the status line exactly, so the same moment has one name.
  const settled = send.state === 'partiallyFailed' ? 'All other emails sent' : 'All emails sent';

  rows.push(
    isSendFullyAccountedFor({ send, counting }) && counting.countedThrough
      ? {
          at: counting.countedThrough,
          label: settled,
          detail: `${formatNumber(counting.deliveredCount)} delivered, ${formatNumber(counting.bouncedCount)} bounced`,
          state: 'past',
        }
      : { at: null, label: settled, state: 'pending' },
  );

  // Events do not necessarily happen in the order the branches above push them
  // — a first delivery can land before the last batch goes out — so the spine
  // is ordered by the clock rather than by construction. Rows with no time are
  // milestones not yet reached and belong at the end, in the order written.
  const happened = rows.filter((row): row is LogRow & { at: Date } => row.at !== null);
  happened.sort((first, second) => first.at.getTime() - second.at.getTime());

  return [...happened, ...rows.filter((row) => row.at === null)];
};

/**
 * The collapsed line is the live half — the one thing here that changes while
 * you watch, and so the only place a running count belongs. A row label like
 * "Sending finished" reads fine beside a timestamp in a list, but alone it
 * names a moment that has passed rather than saying where the send stands now.
 *
 * Every state is named in emails, because emails are what the publisher sent
 * and what they are waiting on — not stages of Ghost's pipeline. There are only
 * three: they are sending, they failed to send, or they all went.
 *
 * One subject the whole way down: how the emails have landed. An email counts
 * as sent once it is delivered or bounced, so these two figures are the sent
 * count, and the arithmetic closes at every moment rather than only at the end.
 *
 * The state names the size of the send, because "14,701 delivered" means one
 * thing against a list of twenty thousand and another against one of ninety.
 * It belongs in the label rather than trailing the figures: the total is the
 * one number here that was fixed before the send began and will not move, so
 * putting it beside the two that are still climbing would read as a third
 * live count. It stays there when the send settles, since the moment the figure
 * is finally confirmed is the last moment to drop it. The line used to lead
 * with dispatch progress while sending — "31,500 of 87,420" — and switch to
 * "40,799 delivered, 288 bounced" the moment the last batch went out, so a
 * state that had not changed appeared to start reporting something else. It
 * also made the line's one number the count of emails handed to a queue, which
 * is the internal boundary this variant refuses to name anywhere else.
 *
 * Deliveries land within seconds of the first batch, so there is no stretch
 * where outcomes are unavailable and dispatch progress is the only thing to
 * say. Counting is treated as running from the moment the send starts, which
 * costs nothing: the fetch job is on a five-minute cron, so the window where
 * Ghost has genuinely looked at nothing is at most five minutes of a send that
 * takes longer than that, and it closes on its own.
 *
 * Which is why zeroes are shown rather than withheld. "0 delivered, 0 bounced
 * so far" is a count that has not moved yet, qualified by the same "so far"
 * that qualifies it an hour later; the alternative was a bare state word with
 * no figure at all, which looks like the line failed to load. It also keeps one
 * shape for the entire lifecycle — the numbers change, the sentence does not —
 * and matches the stage card, which has always shown its two figures at zero
 * here rather than hiding them.
 *
 * Sending runs until the last result is in, not until the last batch goes out.
 * An email that has left but not arrived has no outcome yet, so declaring the
 * whole send "sent" at that point claims 87,420 results on the strength of
 * none. What is being waited on is where the mail ended up, so that is what the
 * state waits on, and one word lands on one moment in both halves of the UI.
 *
 * Nothing here names what Ghost sends mail THROUGH. As far as this UI is
 * concerned Ghost sends the email: the reader has no model for a handoff to
 * somewhere else, cannot act on which side of it a delay sits, and naming it
 * would only invite the question of whose fault the wait is.
 */
const buildStatus = ({ send, counting }: AnalyticsStatus): { label: string; detail?: string } => {
  const total = formatNumber(send.recipientCount);

  if (send.state === 'preparing') {
    return { label: 'Preparing to send emails' };
  }
  if (send.state === 'failed') {
    return {
      label: 'Emails failed to send',
      detail: `None of the ${total} could be sent. ${ENGINEERS_NOTIFIED}`,
    };
  }
  if (send.state === 'partiallyFailed') {
    return {
      label: 'Some emails failed to send',
      detail: `${formatNumber(send.recipientCount - send.reachedCount)} of ${total} could not be sent. ${ENGINEERS_NOTIFIED}`,
    };
  }
  // Both outcomes by name, rather than a collective term for the pair. It has
  // to stay neutral — an email that has resolved may have gone either way, and
  // naming only delivery turns an outcome back into a stage — but "accounted
  // for" bought that neutrality with a word no publisher would use. Saying both
  // is just as even-handed and far plainer. "So far" carries the incompleteness
  // that the collective noun was smuggling in.
  const outstanding = send.reachedCount - counting.deliveredCount - counting.bouncedCount;
  // These two ARE the sent count: an email is sent once it has landed one way
  // or the other, so delivered plus bounced is what the Sent figure beside them
  // reads. Nothing is left over to name.
  //
  // The gap this used to leak was invented upstream. Counting sent as "handed
  // to the queue" produced a third of a list with no outcome against it, which
  // then had to be explained away as "16,695 pending" — a status about Ghost's
  // internals wearing the clothes of a delivery outcome. Removing the boundary
  // removes the remainder, and the arithmetic closes in every state rather than
  // only at the end.
  const breakdown = `${formatNumber(counting.deliveredCount)} delivered, ${formatNumber(counting.bouncedCount)} bounced`;

  // The end earns its own word rather than just dropping "so far": every email
  // that went out now has a result against it, and nothing further will change.
  //
  // Guarded on the send being over, which the early return for `sending` used
  // to do implicitly. Mid-send every email handed over so far can have a result
  // against it while the send is nowhere near done, and that would read as
  // "All emails sent" over a third of a list.
  return send.finishedAt && outstanding <= 0
    ? { label: `All ${total} emails sent`, detail: breakdown }
    : { label: `Sending ${total} emails`, detail: breakdown };
};

/**
 * Variant D's line. One subject, one figure, and an end.
 *
 * Nothing here names delivery or bouncing, and the omission is the variant. On
 * A and C the line carries both, which quietly makes it the page's summary of
 * the whole email: two outcome figures at the top, the same two facts restated
 * as rates in the funnel below, and a reader reconciling them. D gives the line
 * the one thing the figures below genuinely cannot report — how much of the
 * list has actually been handed over, which no delivery count can imply — and
 * leaves every outcome to the tiles that were built to show outcomes.
 *
 * Which is also why `x of y` is `reachedCount of recipientCount` and not
 * delivered-plus-bounced. Those are two different questions with two different
 * answers at every moment of a send, and D has chosen the sending one: an email
 * counts here the moment Ghost gets it out, whatever happens to it afterwards.
 * A and C answer the other one, and both readings are defensible — what is not
 * defensible is a card headed "Sending emails" whose number waits on inboxes.
 *
 * Preparing gets a percentage rather than `0 of 87,420` or an ellipsis, and it
 * is the one state on this line that is not counted in emails. That is the
 * point: no email exists yet, so a count of them can only be zero, and a
 * counter sitting on zero under a live label is the shape of something that
 * should be moving and isn't. A percentage has no such floor — it starts
 * somewhere and climbs — so the same stretch reads as work underway.
 *
 * It also replaces the ellipsis rather than joining it. An ellipsis is what a
 * line says when it has no progress to report; once there is a figure, keeping
 * both is one state announced twice, and the weaker announcement is the one
 * that cannot say how far along it is.
 */
const buildSendingStatus = ({ send }: AnalyticsStatus): { label: string; detail?: string } => {
  const total = formatNumber(send.recipientCount);
  const progress = `${formatNumber(send.reachedCount)} of ${total}`;

  if (send.state === 'preparing') {
    return { label: 'Preparing emails', detail: formatPercentage(send.preparedFraction) };
  }
  if (send.state === 'failed') {
    return {
      label: 'Emails failed to send',
      detail: `None of the ${total} could be sent. ${ENGINEERS_NOTIFIED}`,
    };
  }
  // A partial failure is the one settled state D still has to show, so the card
  // stays for it. `isSendComplete` is false here, which is what keeps it on
  // screen — the send is over, but "over" and "done" are not the same word and
  // this is the difference between them.
  if (send.state === 'partiallyFailed') {
    return {
      label: 'Some emails failed to send',
      detail: `${progress} sent. ${ENGINEERS_NOTIFIED}`,
    };
  }

  return { label: 'Sending emails', detail: progress };
};

const SendActivityLog: React.FC = () => {
  const resolved = useStatusCopy();
  const { settings } = useAnalyticsData();
  const [isOpen, setIsOpen] = useState(false);

  const isSendingOnly = resolved?.variant === 'sendingOnly';

  if (
    !resolved ||
    (resolved.variant !== 'activityLog' && resolved.variant !== 'statusLine' && !isSendingOnly)
  ) {
    return null;
  }

  // D retires the moment the last batch is away. It only ever claimed to be
  // about sending, so when sending is done it has nothing left to say — and a
  // card that stays to report a finished thing is how a status turns into
  // furniture. Where it goes is not nowhere: the header picks the fact up as
  // "Published and sent to 87,420 members", which is the permanent, settled
  // form of the same sentence and costs no card.
  //
  // A failed or partly failed send is not complete, so it holds. That is the
  // one state the figures below structurally cannot report — their denominator
  // is the addressed list, so they describe a send in which nothing went wrong.
  if (isSendingOnly && isSendComplete(resolved.status)) {
    return null;
  }

  // D keeps the line and drops everything that opens: no control, no trail.
  // The line has to carry the whole answer on its own, which is the point of
  // having it as a variant — it is the version that cannot defer anything to a
  // second screen, so whatever it fails to say is simply not said.
  const isExpandable = resolved.variant === 'activityLog';

  const timezone = getSiteTimezone(settings);
  const at = (date: Date | null) => (date ? formatClock(date, timezone) : null);
  const rows = buildRows(resolved.status);
  const status = isSendingOnly ? buildSendingStatus(resolved.status) : buildStatus(resolved.status);
  // The state where nothing has happened yet, so the label has to carry the
  // waiting itself. Except in D, which has a percentage doing that job — and
  // doing it better, since it moves.
  const isPreparing = resolved.status.send.state === 'preparing' && !isSendingOnly;

  return (
    <Stack className="rounded-lg border border-border-default bg-surface-elevated p-4" gap="none">
      {/* Collapsed this is one line, cheap enough to persist without becoming
          the furniture a permanent banner turns into. */}
      <Inline align="center" gap="md" justify="between">
        <Inline align="center" gap="sm">
          <StatusGlyph status={resolved.status} />
          <Text size="sm">
            <Text as="strong" size="sm" weight="semibold">
              {status.label}
              {isPreparing && <AnimatedEllipsis />}
            </Text>
            {status.detail && (
              <Text as="span" size="sm" tone="secondary">{` · ${status.detail}`}</Text>
            )}
          </Text>
        </Inline>
        {isExpandable && (
          <Button className="shrink-0" size="sm" variant="ghost" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? 'Hide details' : 'Show details'}
            {isOpen ? <LucideIcon.ChevronUp size={14} /> : <LucideIcon.ChevronDown size={14} />}
          </Button>
        )}
      </Inline>

      {isExpandable && isOpen && (
        <Stack className="mt-3 border-t border-border-default pt-4" gap="none">
          {rows.map((row, index) => {
            const isFirst = index === 0;
            const isLast = index === rows.length - 1;

            return (
              <Inline key={row.label} align="start" className="gap-3" gap="none">
                <Text className="w-14 shrink-0 text-right tabular-nums" size="xs" tone="secondary">
                  {at(row.at)}
                </Text>

                {/* The rail is built from two segments that meet at the dot,
                    and the row's spacing lives on the text column rather than
                    the row, so the column stretches through the gap and the
                    line is continuous.

                    Colour means one thing: grey happened, hollow has not
                    happened yet, red is a problem. A segment is dotted when the
                    row below it is pending, so the approach to something not
                    yet reached looks different from the path between things
                    that have. */}
                <div className="flex w-2 shrink-0 flex-col items-center self-stretch">
                  <span
                    className={`h-[5px] ${isFirst ? 'w-px' : railClass(row.state === 'pending')}`}
                  />
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      row.state === 'problem'
                        ? 'bg-state-danger'
                        : row.state === 'pending'
                          ? 'border border-muted-foreground/40'
                          : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span
                    className={`flex-1 ${
                      isLast ? 'w-px' : railClass(rows[index + 1]?.state === 'pending')
                    }`}
                  />
                </div>

                <Stack className={isLast ? '' : 'pb-4'} gap="none">
                  <Text
                    className="leading-5"
                    size="sm"
                    tone={row.state === 'pending' ? 'tertiary' : 'primary'}
                    weight="medium"
                  >
                    {row.state === 'problem' ? (
                      <span className="text-destructive">{row.label}</span>
                    ) : (
                      row.label
                    )}
                  </Text>
                  {row.detail && (
                    <Text size="sm" tone="secondary">
                      {row.detail}
                    </Text>
                  )}
                </Stack>
              </Inline>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default SendActivityLog;
