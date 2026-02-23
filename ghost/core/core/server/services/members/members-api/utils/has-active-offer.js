const getDiscountWindow = require('./get-discount-window');

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
    const subscriptionData = {
        discount_start: subscriptionModel.get('discount_start'),
        discount_end: subscriptionModel.get('discount_end'),
        trial_start_at: subscriptionModel.get('trial_start_at'),
        trial_end_at: subscriptionModel.get('trial_end_at'),
        start_date: subscriptionModel.get('start_date')
    };

    // Check for active Stripe discount (post-6.16 data)
    // discount_start takes precedence over trial and legacy fallback
    const discountWindow = getDiscountWindow(subscriptionData, null);
    if (discountWindow) {
        return !discountWindow.end || new Date(discountWindow.end) > new Date();
    }

    // Check for active trial (trial/free_months offers)
    if (subscriptionData.trial_end_at && new Date(subscriptionData.trial_end_at) > new Date()) {
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

        const legacyWindow = getDiscountWindow(subscriptionData, offer);
        if (legacyWindow) {
            return !legacyWindow.end || new Date(legacyWindow.end) > new Date();
        }

        return false;
    } catch (e) {
        // If we can't look up the offer, err on the side of blocking
        return true;
    }
};
