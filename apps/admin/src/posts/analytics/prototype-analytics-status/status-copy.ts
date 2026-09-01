// PROTOTYPE ONLY — not production code. See ./README.md
//
// One source of truth for what every variant says, so switching treatment
// changes placement and never meaning.
//
// Three rules govern the wording:
//
// 1. State the watermark, don't diagnose. The analytics cursor only advances
//    when events are actually processed, so a quiet inbox and a stalled
//    pipeline look identical from the outside (the service warns about exactly
//    this false positive in email-analytics-service-wrapper.ts). "Processed
//    through 12:15pm" is a fact. "Analytics are delayed" is a guess that can be
//    wrong, and a wrong alarm costs more trust than no alarm.
//
// 2. Name the clicks/opens split every time it matters. Clicks come from
//    Ghost's own redirect service and are live; opens come from polling the
//    email provider. Seeing live clicks next to zero opens is the single thing
//    that makes a publisher think the send broke.
//
// 3. Never let one dimension hide the other. A failed send leads, because it is
//    the more serious fact and Ghost knows it for certain. But a stale
//    watermark still gets its clause, so "some batches were rejected" is never
//    mistaken for "and everything else here is final".
//
// 4. Name the step, never the vendor. A newsletter crosses three stages, and a
//    vague verb like "gone out" can mean any of them:
//      a. Ghost SENDS the email. Ghost knows this instantly, and it says
//         nothing about whether anything arrived.
//      b. It is DELIVERED to the inbox, or it bounces.
//      c. Ghost PROCESSES the delivery and open data, roughly every 5 minutes.
//         This is the step that lags. Every surface times it the same way,
//         with a watermark: "Processed through 12:15pm" names the point the
//         pipeline has reached, which is a fact, where "up to date" or
//         "18 minutes behind" would be a verdict on it.
//    All three are described as things Ghost does. The email provider is an
//    implementation detail the publisher did not choose and cannot act on;
//    naming it invites "so is this your fault or theirs?", which is one more
//    question, not one fewer. Clicks skip every stage: the reader hits Ghost's
//    own redirect, so they are processed as they happen.

import { formatNumber } from '@tryghost/shade/utils';

/**
 * 24-hour clock. Shade's `formatDisplayTime` renders "1:15pm", which is what
 * the post subtitle on this same page uses — so these two now differ. Worth
 * settling product-wide rather than per surface.
 */
export const formatClock = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date);
import type { AnalyticsStatus } from './types';

export type StatusTone = 'info' | 'success' | 'warning' | 'danger';

export interface StatusCopy {
  tone: StatusTone;
  /** Leading sentence. Runs inline with `body`. */
  title: string;
  /** The explanation. Answers "so is it broken or not?". */
  body: string;
  /**
   * The counting watermark alone: how current these numbers are, independent of
   * whatever headline the send state produced. A send-state headline says
   * nothing about how current the numbers are, so the two must not be
   * conflated. `null` when nothing is being counted at all.
   */
  watermark: string | null;
  /** True while numbers are still expected to move. */
  isMoving: boolean;
}

/**
 * The single line for the strip on top of the funnel card, shown whenever
 * `isMoving` is true.
 *
 * One sentence for every unresolved state, deliberately. The strip is attached
 * to the figures themselves, so it only has to answer "are these final?" — the
 * treatments elsewhere on the page are where the send is explained, and a
 * caveat that rewords itself as the send progresses reads as new information
 * each time it changes when nothing about the answer has changed.
 *
 * That means it does NOT split opens from clicks the way rule 2 does. The split
 * is true — clicks come from Ghost's own redirects and never lag — but stating
 * it here spends the sentence on an exception to a caveat, and leaves a reader
 * working out which of the three figures the caveat still applies to. The
 * treatments make the distinction where there is room to make it properly.
 *
 * "Gone out and been counted" covers both halves of what is still moving, so
 * the line stays literally true from the first batch to the last open: while
 * sending, emails are still going out; after it, they are still being counted.
 */
export const MOVING_FIGURES_NOTE =
  'These numbers will keep rising until every email has gone out and been counted.';

const formatLag = (minutes: number): string => {
  if (minutes < 1) {
    return 'less than a minute';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

export const getStatusCopy = (status: AnalyticsStatus, timezone: string): StatusCopy => {
  const { send, counting } = status;
  const through = counting.countedThrough ? formatClock(counting.countedThrough, timezone) : null;
  const lag = formatLag(counting.lagMinutes);
  const total = formatNumber(send.recipientCount);
  const reached = formatNumber(send.reachedCount);

  // Stated once and shared by every branch, so no caller has to rebuild it.
  // Null for a wholly failed send: nothing was handed over, so nothing is being
  // counted and a timestamp would imply otherwise.
  const watermark =
    send.state === 'failed'
      ? null
      : counting.state === 'notStarted'
        ? 'Not processed yet'
        : `Processed through ${through}`;

  // Clicks never lag, so saying so is only useful while something else does.
  const clicks =
    counting.state === 'current'
      ? ''
      : ' Clicks are processed as they happen, so those are already up to date.';

  // --- Sending problems lead, and carry the counting clause with them. ------
  if (send.state === 'failed') {
    return {
      tone: 'danger',
      title: "This newsletter wasn't sent.",
      body: `Sending failed, so none of the ${total} members received it. There is no delivery or open data for this post.`,
      watermark,
      isMoving: false,
    };
  }

  if (send.state === 'partiallyFailed') {
    const missed = formatNumber(send.recipientCount - send.reachedCount);
    // "For those" keeps the counting sentence scoped to what was sent, so it
    // cannot be read as covering the members who never received it.
    const counted =
      counting.state === 'notStarted'
        ? "Delivery and open data is processed every 5 minutes and the first run hasn't happened yet."
        : counting.state === 'current'
          ? `For those, opens and deliveries are processed through ${through}.`
          : `For those, opens and deliveries are processed through ${through}, ${lag} behind.`;

    return {
      tone: 'danger',
      title: `${missed} of ${total} members were never sent this newsletter.`,
      body: `Sending failed part way through, so the numbers below only cover the ${reached} that went out. ${counted}`,
      watermark,
      isMoving: counting.state !== 'current',
    };
  }

  if (send.state === 'sending') {
    return {
      tone: 'info',
      title: 'Still sending.',
      body: `${reached} of ${total} emails have been sent so far. Delivery and open data starts being processed once sending finishes.`,
      watermark,
      isMoving: true,
    };
  }

  // --- Sending is clean, so the counting stage leads. -----------------------
  switch (counting.state) {
    case 'notStarted':
      return {
        tone: 'info',
        title: 'No opens processed yet.',
        body: `All ${total} emails were sent. Delivery and open data is processed every 5 minutes and the first run hasn't happened yet, so zero is expected.${clicks}`,
        watermark,
        isMoving: true,
      };

    case 'counting':
      return {
        tone: 'info',
        // The opens themselves are not late, Ghost's processing of them is.
        // Naming the data also points at the numbers directly below.
        title: `Delivery and open data is ${lag} behind.`,
        body: `Processed through ${through} and still catching up, so the numbers below will rise. Nothing is lost.${clicks}`,
        watermark,
        isMoving: true,
      };

    case 'current':
    default:
      return {
        tone: 'success',
        title: 'Up to date.',
        body: `Opens and deliveries are processed through ${through}.`,
        watermark,
        isMoving: false,
      };
  }
};
