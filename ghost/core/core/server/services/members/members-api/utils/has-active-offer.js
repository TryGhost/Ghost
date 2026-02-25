/**
 * Determines if a subscription currently has an active offer.
 * Uses discount_start/discount_end (synced from Stripe) when available,
 * falls back to offer duration lookup for legacy data (pre-6.16).
 *
 * @param {object} subscriptionModel - Bookshelf model for members_stripe_customers_subscriptions
 * @param {object} offersAPI - OffersAPI instance with getOffer()
 * @returns {Promise<boolean>}
 */
module.exports = async function hasActiveOffer(subscriptionModel, offersAPI) {
    const discountStart = subscriptionModel.get('discount_start');
    const discountEnd = subscriptionModel.get('discount_end');
    const trialEndAt = subscriptionModel.get('trial_end_at');

    // Check for active Stripe discount (post-6.16 data)
    if (discountStart) {
        return !discountEnd || new Date(discountEnd) > new Date();
    }

    // Check for active trial (trial offers)
    if (trialEndAt && new Date(trialEndAt) > new Date()) {
        return true;
    }

    // Fallback: legacy data where discount_start was never populated
    const offerId = subscriptionModel.get('offer_id');
    if (!offerId) {
        return false;
    }

    // Look up the offer to determine if it's still active based on duration
    try {
        const offer = await offersAPI.getOffer({id: offerId});
        if (!offer) {
            return false;
        }

        if (offer.duration === 'forever') {
            return true;
        }

        if (offer.duration === 'once') {
            return false; // once = already applied and expired
        }

        if (offer.duration === 'repeating' && offer.duration_in_months > 0) {
            const startDate = new Date(subscriptionModel.get('start_date'));
            const end = new Date(startDate);

            end.setUTCMonth(end.getUTCMonth() + offer.duration_in_months);

            return new Date() < end;
        }
    } catch (e) {
        // If we can't look up the offer, err on the side of blocking
        return true;
    }

    return false;
};
