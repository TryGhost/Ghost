import * as errors from '@tryghost/errors';
import type { OfferDTO } from '../../../offers/application/offer-mapper';

type SubscriptionMinimal = {
  discount_start: Date | null;
  discount_end: Date | null;
  start_date: Date;
  current_period_end: Date;
};

type DiscountWindow = {
  start: Date;
  end: Date | null;
};

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function isLastDayOfMonth(date: Readonly<Date>): boolean {
  return date.getUTCDate() === getLastDayOfMonth(date.getUTCFullYear(), date.getUTCMonth());
}

function getAnchoredBillingDate(anchorDate: Readonly<Date>, monthOffset: number): Date {
  const targetMonthIndex = anchorDate.getUTCMonth() + monthOffset;
  const targetYear = anchorDate.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const targetLastDay = getLastDayOfMonth(targetYear, targetMonth);
  const targetDay = isLastDayOfMonth(anchorDate)
    ? targetLastDay
    : Math.min(anchorDate.getUTCDate(), targetLastDay);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      anchorDate.getUTCHours(),
      anchorDate.getUTCMinutes(),
      anchorDate.getUTCSeconds(),
      anchorDate.getUTCMilliseconds(),
    ),
  );
}

function getLastDiscountedPayment(
  nextBillingDate: Readonly<Date>,
  discountEnd: Readonly<Date>,
): Date {
  const monthOffset =
    (discountEnd.getUTCFullYear() - nextBillingDate.getUTCFullYear()) * 12 +
    (discountEnd.getUTCMonth() - nextBillingDate.getUTCMonth());

  let lastDiscountedBillingDate = getAnchoredBillingDate(nextBillingDate, monthOffset);

  if (lastDiscountedBillingDate > discountEnd) {
    lastDiscountedBillingDate = getAnchoredBillingDate(nextBillingDate, monthOffset - 1);
  }

  return lastDiscountedBillingDate;
}

/**
 * Computes the discount window for a subscription based on available data.
 * Returns {start, end} if a discount window can be determined, null otherwise.
 *
 * Handles two data paths:
 * 1. Stripe coupon discounts (post-6.16) - uses discount_start / discount_end
 * 2. Legacy fallback - computes from offer duration and start_date
 */
export function getDiscountWindow(
  subscription: SubscriptionMinimal,
  offer: Pick<OfferDTO, 'duration' | 'redemption_type' | 'duration_in_months'>,
): DiscountWindow | null {
  // Stripe coupon discount (post-6.16 data)
  if (subscription.discount_start) {
    if (offer.duration === 'repeating') {
      if (!subscription.discount_end) {
        throw new errors.InternalServerError({
          message: 'Subscription has discount_start but no discount_end for a repeating offer',
        });
      }

      const discountEnd = new Date(subscription.discount_end);
      const currentPeriodEnd = new Date(subscription.current_period_end);

      if (discountEnd <= new Date()) {
        return null;
      }

      // A discount ending at, or before, the current billing period end won't affect the next payment
      if (discountEnd <= currentPeriodEnd) {
        return null;
      }

      // Match the end date with the last discounted payment
      return {
        start: subscription.discount_start,
        end: getLastDiscountedPayment(currentPeriodEnd, discountEnd),
      };
    }

    if (offer.duration === 'once') {
      return {
        start: subscription.discount_start,
        end: subscription.current_period_end,
      };
    }

    return {
      start: subscription.discount_start,
      end: subscription.discount_end || null,
    };
  }

  // Legacy fallback for subscriptions without discount start / end dates
  // This applies to signup offers only, as retention offers have been added after the introduction of discount start / end dates
  if (offer.redemption_type !== 'signup') {
    return null;
  }

  if (offer.duration === 'once') {
    return null;
  }

  if (offer.duration === 'forever') {
    return { start: subscription.start_date, end: null };
  }

  if (offer.duration === 'repeating' && offer.duration_in_months && offer.duration_in_months > 0) {
    const end = getAnchoredBillingDate(
      new Date(subscription.start_date),
      offer.duration_in_months - 1,
    );
    const currentPeriodEnd = new Date(subscription.current_period_end);

    if (end <= new Date()) {
      return null;
    }

    // A discount ending before the end of the current billing period won't affect the next payment
    if (end < currentPeriodEnd) {
      return null;
    }

    return { start: subscription.start_date, end };
  }

  return null;
}
