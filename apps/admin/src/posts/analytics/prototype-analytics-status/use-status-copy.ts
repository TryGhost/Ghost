// PROTOTYPE ONLY — not production code. See ./README.md

import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { formatClock, getStatusCopy, type StatusCopy } from './status-copy';
import { hasBeenEmailed } from '@tryghost/admin-x-framework';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { usePrototypeAnalyticsStatus } from './prototype-context';
import { formatNumber } from '@tryghost/shade/utils';
import { isGatedVariant, isSendComplete } from './types';
import type { AnalyticsStatus, StatusVariant } from './types';

interface ResolvedStatus {
  copy: StatusCopy;
  variant: StatusVariant;
  status: AnalyticsStatus;
}

/**
 * Returns the copy for the active phase, or null when nothing should render —
 * either the post was never emailed, or the variant is switched off.
 *
 * `upToDate` deliberately still returns copy. Each variant decides for itself
 * whether a settled pipeline is worth any pixels: the pill keeps showing the
 * watermark (that is the whole point of a watermark), the banner hides.
 */
export const useStatusCopy = (): ResolvedStatus | null => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();
  const { settings } = useAnalyticsData();

  if (!prototype || prototype.variant === 'off') {
    return null;
  }

  if (!post || !hasBeenEmailed(post)) {
    return null;
  }

  return {
    copy: getStatusCopy(prototype.status, getSiteTimezone(settings)),
    variant: prototype.variant,
    status: prototype.status,
  };
};

/**
 * The stage card is the only treatment that lives in the newsletter card's slot
 * on Overview, and it behaves like the send log: it persists once the send has
 * settled, and it never displaces the performance card. A status about the send
 * is not a stand-in for the newsletter's numbers, so the two sit together
 * throughout rather than taking turns.
 *
 * Nothing guards the performance card against opening on a wall of zeros any
 * more, which is what `shouldShowPerformanceCard` was for. The EMAIL DATA axis
 * covers it, and covers it better: an empty state that says what it is waiting
 * for beats a card that is silently absent.
 */
export const useNewsletterCards = (): { showProgress: boolean; showPerformance: boolean } => {
  const resolved = useStatusCopy();

  return { showProgress: resolved?.variant === 'stageCard', showPerformance: true };
};

/**
 * How current the figures are, as a clock time. Rates carry no timestamp of
 * their own, so a reader has no way to tell a 19% that is an hour stale from a
 * 19% recorded a minute ago — and those call for opposite reactions.
 *
 * Null until something has been processed: "up to" a time when nothing has been
 * read yet would be pointing at a cursor that has not moved.
 *
 * Null in variant D too: the watermark is a counting fact, and D refuses to
 * speak about counting at all. E inherits the suppression along with the rest
 * of D's chrome.
 */
export const useCountedThrough = (): string | null => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();
  const { settings } = useAnalyticsData();

  if (!prototype || (prototype.variant === 'off' && prototype.emailData === 'off')) {
    return null;
  }
  if (prototype.variant === 'sendingOnly' || isGatedVariant(prototype.variant)) {
    return null;
  }
  if (!post || !hasBeenEmailed(post)) {
    return null;
  }

  const { countedThrough } = prototype.status.counting;

  return countedThrough ? `Up to ${formatClock(countedThrough, getSiteTimezone(settings))}` : null;
};

/** Why the email figures are being withheld, or null when they are not. */
export type EmailDataHiddenReason = 'pending' | 'partial' | 'failed';

/**
 * Two different kinds of incomplete, and both disqualify the numbers.
 *
 * `pending` is temporary: nothing has been recorded yet, and it resolves on its
 * own within a polling cycle.
 *
 * The other two never resolve. A send that only partly went out cannot produce
 * a performance figure for this post at all — an open rate over the portion
 * that happened to make it is a rate for a different, smaller send, and it is
 * the flattering half, since the members who were reached are the ones whose
 * addresses worked. Reporting it as though it described the post invites a
 * comparison against every other post on the site that is not a comparison.
 * Waiting does not fix that, so counting being up to date does not release it.
 */
export const useEmailDataHiddenReason = (): EmailDataHiddenReason | null => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  if (!prototype) {
    return null;
  }
  if (!post || !hasBeenEmailed(post)) {
    return null;
  }

  // E is D with a gate. The line above reads "Sending emails · 31,500 of
  // 87,420" and retires the moment the last batch is away — E makes every card
  // below wait for that same moment, so the page tells one story: the line
  // counts the send up to 100%, then the figures arrive together. The gate is a
  // property of the variant, so it applies regardless of the EMAIL DATA axis
  // and does not fall through to it: a second gate waiting on the first
  // delivery would hold the data back right after the line promised it.
  //
  // Partial and failed sends never reach 100%, so they hold — which is the one
  // place E overrules its parent: D shows figures over a half-failed send and
  // trusts its card to qualify them, while E's whole contract is that figures
  // only appear for a send that fully went out.
  if (isGatedVariant(prototype.variant)) {
    if (prototype.status.send.state === 'failed') {
      return 'failed';
    }
    if (prototype.status.send.state === 'partiallyFailed') {
      return 'partial';
    }
    return isSendComplete(prototype.status) ? null : 'pending';
  }

  if (prototype.emailData === 'off') {
    return null;
  }

  const { send, counting } = prototype.status;

  if (send.state === 'failed') {
    return 'failed';
  }
  // D declines the withholding argument for a partial send, on purpose, so the
  // two positions can be looked at side by side rather than argued about.
  //
  // The case for hiding is that a rate over the half of the list that happened
  // to go out is a rate for a different, smaller, and flatteringly healthier
  // send. The case against is that it is still the only account anyone has of
  // what those emails did, and the reader who most needs it is the one whose
  // send just half-failed. D takes the second: it says plainly on the card
  // above that some emails never went, and then trusts that sentence to qualify
  // the figures rather than deleting them. Nothing is claimed that the card has
  // not already corrected.
  if (send.state === 'partiallyFailed' && prototype.variant !== 'sendingOnly') {
    return 'partial';
  }

  // Temporary, and only until the first recorded event: a partial figure on a
  // healthy send is a real one, and holding everything back until the last
  // bounce report would keep hours of legitimate data off the page.
  return counting.deliveredCount === 0 ? 'pending' : null;
};

export const useEmailDataHidden = (): boolean => useEmailDataHiddenReason() !== null;

/**
 * Variant D's replacement for the card it retires: the send, stated once, in
 * the post's own subtitle.
 *
 * The posts list already says this — "Published and sent" with "to 87,420
 * members" revealed on hover — and it is the right sentence in the wrong place
 * twice over. It is hidden behind a pointer, so it does not exist on a touch
 * screen and does not exist for anyone not already hunting for it; and it is on
 * the list, where a reader is scanning forty posts, rather than on the analytics
 * page for the one post they came to look at. Here it is neither: no hover, no
 * control, no card. It sits in the line that was already going to say when the
 * post was published, and says who it went to as well.
 *
 * Only on a clean completed send. While sending it would be a claim about a
 * number that is still moving, and after a partial failure it would be false —
 * both of which are exactly when the card is still on screen saying the true
 * thing instead. One fact, one place, at every moment.
 */
export const useSentToMembers = (): string | null => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  // E retires its line at the same moment D does, so it hands the fact to the
  // subtitle the same way.
  if (!prototype || (prototype.variant !== 'sendingOnly' && !isGatedVariant(prototype.variant))) {
    return null;
  }
  if (!post || !hasBeenEmailed(post)) {
    return null;
  }
  if (!isSendComplete(prototype.status)) {
    return null;
  }

  const count = prototype.status.send.recipientCount;

  return `${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`;
};

/**
 * Whether the funnel's first tile is counting deliveries rather than sends.
 *
 * D moves the sending story out of the funnel and into its own card, which
 * leaves the first tile free to report the thing the card refuses to: what
 * came back. "Delivered of 87,420" keeps the denominator the reader has been
 * watching all along — the whole list — so the tile still answers "how much of
 * this send has landed", just with the honest numerator.
 */
export const useSendingOnlyVariant = (): boolean => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  return Boolean(prototype?.variant === 'sendingOnly' && post && hasBeenEmailed(post));
};

/**
 * Whether the funnel's first tile is counting dispatches rather than results.
 *
 * Where D relabels the tile Delivered, E keeps it Sent and makes the word
 * literal: dispatched over addressed, the same fraction its line was counting.
 * The gate means the tile is only ever visible once the send is done, so on a
 * clean send the ring reads 100% — the line's final figure, restated in the
 * chart's own language, rather than a delivered count falling a hair short.
 */
export const useGatedUntilSentVariant = (): boolean => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  return Boolean(prototype && isGatedVariant(prototype.variant) && post && hasBeenEmailed(post));
};

/**
 * Whether the funnel's first ring counts deliveries under a Sent figure.
 *
 * F keeps E's tile — Sent, the whole dispatched list — but hands the ring a
 * different job: how much of that list has landed. The tile answers "did it go
 * out", the ring answers "did it arrive", and the gap between a full number and
 * a ring still filling is the delivery tail made visible.
 */
export const useDeliveryRingVariant = (): boolean => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  return Boolean(prototype?.variant === 'deliveryRing' && post && hasBeenEmailed(post));
};

/**
 * Whether Sent has left the funnel entirely.
 *
 * G's funnel is Delivered → Opened → Clicked, three metrics with the same
 * anatomy — a count, a rate, an average to compare against — and Sent is the
 * denominator they all sit over, stated once in the post's subtitle rather
 * than competing for a tile. Each ring's denominator is the previous ring's
 * numerator, which is what the arrows between them were always implying.
 */
export const useSentAsDenominatorVariant = (): boolean => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  return Boolean(prototype?.variant === 'sentAsDenominator' && post && hasBeenEmailed(post));
};
