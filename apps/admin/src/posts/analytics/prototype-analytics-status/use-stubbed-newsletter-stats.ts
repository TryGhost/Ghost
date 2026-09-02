// PROTOTYPE ONLY — not production code. See ./README.md
//
// Puts the newsletter figures on the same fixture as everything else.
//
// Without this the page contradicts itself: the switcher says a send is 36%
// through, the status line and the progress bar agree, and then the funnel
// underneath reports whatever the real post actually did. Every question this
// prototype exists to answer — does the empty state pull its weight, does the
// status line say enough on its own — is a question about how the parts read
// TOGETHER, and they cannot be read together while half of them describe a
// different send.
//
// Rates divide by DELIVERED, which is what every tool a publisher compares
// Ghost against does: Mailchimp defines open rate as the share of "successfully
// delivered emails" that were opened. Dividing by the addressed list instead —
// which is what Ghost does today, opened_count / email_count — understates
// every rate by the bounce rate, and understates it enormously mid-send, when
// most of the list has no result yet.
//
// That distinction matters more than it looks. With the wrong denominator the
// rate is low because the maths is wrong. With the right one it is low for a
// real reason: deliveries land in minutes and opens accrue over days, so early
// on a correct rate is a true rate over a young sample. Only the second is a
// case for waiting, and it is the weaker of the two.
//
// So opens lag deliveries here rather than tracking them in lockstep. Modelled
// off how far counting has got, the fixture's only proxy for elapsed time.

import { hasBeenEmailed } from '@tryghost/admin-x-framework';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { usePrototypeAnalyticsStatus } from './prototype-context';

export interface NewsletterStats {
  sent: number;
  /**
   * Everyone the post was addressed to. Only ever differs from `sent` while a
   * send is in flight or after a partial failure — which is exactly when the
   * Newsletter tab's bare "Sent" figure and the status line's "31,500 of
   * 87,420" look like two different claims about one send.
   */
  addressed: number;
  /**
   * Confirmed delivered, on its own. `sent` folds bounces in with it, which is
   * the right total for a tile called Sent and the wrong one for a tile called
   * Delivered — variant D relabels it, so it needs the figure that matches the
   * new word rather than the old number under a new caption.
   */
  delivered: number;
  /**
   * Recipients whose batches Ghost has handed over, whatever happens to them
   * afterwards. Variant E's Sent tile means dispatch rather than landing, so it
   * needs this figure — on a completed send it equals `addressed`, which is
   * what makes E's first ring read 100%.
   */
  dispatched: number;
  opened: number;
  clicked: number;
  openedRate: number;
  clickedRate: number;
}

/** Plausible engagement for a healthy list, applied to what has been delivered. */
const OPENS_PER_DELIVERY = 0.42;
const CLICKS_PER_DELIVERY = 0.037;

export const useStubbedNewsletterStats = (
  real: Omit<NewsletterStats, 'addressed' | 'delivered' | 'dispatched'>,
): NewsletterStats => {
  const prototype = usePrototypeAnalyticsStatus();
  const { post } = usePostAnalytics();

  // Same condition that greys out the pipeline rows in the switcher: with every
  // treatment off, nothing is reading the fixture and the real numbers stand.
  if (!prototype || (prototype.variant === 'off' && prototype.emailData === 'off')) {
    return { ...real, addressed: real.sent, delivered: real.sent, dispatched: real.sent };
  }

  if (!post || !hasBeenEmailed(post)) {
    return { ...real, addressed: real.sent, delivered: real.sent, dispatched: real.sent };
  }

  const { send, counting } = prototype.status;
  const delivered = counting.deliveredCount;

  // How much of the send has reported back, standing in for how long it has
  // been running. Opens are scaled by it so that a third of the way through the
  // rate is a third of where it will settle, rather than already final.
  const elapsed = send.reachedCount > 0 ? delivered / send.reachedCount : 0;
  // Sent means landed, not dispatched: an email in a queue has not been sent to
  // anybody yet. Which makes the tab's Sent tile the sum of the two figures on
  // the status line above it, rather than a third number between them.
  const sent = delivered + counting.bouncedCount;
  const opened = Math.round(delivered * OPENS_PER_DELIVERY * elapsed);
  const clicked = Math.round(delivered * CLICKS_PER_DELIVERY * elapsed);

  return {
    sent,
    addressed: send.recipientCount,
    delivered,
    dispatched: send.reachedCount,
    opened,
    clicked,
    openedRate: delivered > 0 ? opened / delivered : 0,
    clickedRate: delivered > 0 ? clicked / delivered : 0,
  };
};
