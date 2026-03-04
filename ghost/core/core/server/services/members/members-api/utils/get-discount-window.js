/**
 * Computes the discount window for a subscription based on available data.
 * Returns {start, end} if a discount window can be determined, null otherwise.
 *
 * Handles two data paths:
 * 1. Stripe coupon discounts (post-6.16) - uses discount_start / discount_end
 * 2. Legacy fallback - computes from offer duration and start_date
 *
 * @param {object} subscription - plain object with: discount_start, discount_end, start_date
 * @param {object|null} offer - offer data with: duration, duration_in_months.
 *   Pass null to skip offer-dependent checks.
 * @returns {{start: *, end: *}|null}
 */
module.exports = function getDiscountWindow(subscription, offer) {
    // Stripe coupon discount (post-6.16 data)
    if (subscription.discount_start) {
        return {
            start: subscription.discount_start,
            end: subscription.discount_end || null
        };
    }

    // Legacy fallback: compute window from offer duration
    if (!offer) {
        return null;
    }

    if (offer.duration === 'once') {
        return null;
    }

    if (offer.duration === 'forever') {
        return {start: subscription.start_date, end: null};
    }

    if (offer.duration === 'repeating' && offer.duration_in_months > 0) {
        const end = new Date(subscription.start_date);
        end.setUTCMonth(end.getUTCMonth() + offer.duration_in_months);

        if (new Date() >= end) {
            return null;
        }

        return {start: subscription.start_date, end};
    }

    return null;
};
