/**
 * @typedef {import('../../../offers/application/offer-mapper').OfferDTO} OfferDTO
 */

/**
 * @typedef {object} SubscriptionMinimal
 * @prop {Date|null} discount_start
 * @prop {Date|null} discount_end
 * @prop {Date} start_date
 * @prop {Date} current_period_end
 */

/**
 * @typedef {object} DiscountWindow
 * @prop {Date} start
 * @prop {Date|null} end
 */

function getLastDayOfMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function isLastDayOfMonth(date) {
    return date.getUTCDate() === getLastDayOfMonth(date.getUTCFullYear(), date.getUTCMonth());
}

function getAnchoredBillingDate(anchorDate, monthOffset) {
    const targetMonthIndex = anchorDate.getUTCMonth() + monthOffset;
    const targetYear = anchorDate.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const targetLastDay = getLastDayOfMonth(targetYear, targetMonth);
    const targetDay = isLastDayOfMonth(anchorDate) ? targetLastDay : Math.min(anchorDate.getUTCDate(), targetLastDay);

    return new Date(Date.UTC(
        targetYear,
        targetMonth,
        targetDay,
        anchorDate.getUTCHours(),
        anchorDate.getUTCMinutes(),
        anchorDate.getUTCSeconds(),
        anchorDate.getUTCMilliseconds()
    ));
}

function getLastDiscountedPayment(nextBillingDate, discountEnd) {
    const monthOffset =
        ((discountEnd.getUTCFullYear() - nextBillingDate.getUTCFullYear()) * 12) +
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
 *
 * @param {SubscriptionMinimal} subscription
 * @param {OfferDTO} offer
 * @returns {DiscountWindow|null}
 */

module.exports = function getDiscountWindow(subscription, offer) {
    // Stripe coupon discount (post-6.16 data)
    if (subscription.discount_start) {
        if (offer.duration === 'repeating') {
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
                end: getLastDiscountedPayment(currentPeriodEnd, discountEnd)
            };
        }

        if (offer.duration === 'once') {
            return {
                start: subscription.discount_start,
                end: subscription.current_period_end
            };
        }

        return {
            start: subscription.discount_start,
            end: subscription.discount_end || null
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
        return {start: subscription.start_date, end: null};
    }

    if (offer.duration === 'repeating' && offer.duration_in_months > 0) {
        const end = getAnchoredBillingDate(new Date(subscription.start_date), offer.duration_in_months - 1);
        const currentPeriodEnd = new Date(subscription.current_period_end);

        if (end <= new Date()) {
            return null;
        }

        // A discount ending before the end of the current billing period won't affect the next payment
        if (end < currentPeriodEnd) {
            return null;
        }

        return {start: subscription.start_date, end};
    }

    return null;
};
