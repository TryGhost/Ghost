/**
 * @typedef {import('../../../../services/offers/application/offer-mapper').OfferDTO} OfferDTO
 */

/**
 * @typedef {object} SubscriptionDiscount
 * @prop {string} offer_id
 * @prop {string} start
 * @prop {string|null} end
 * @prop {'once'|'repeating'|'forever'} duration
 * @prop {'percent'|'fixed'} type
 * @prop {number} amount
 */

/**
 * @typedef {object} NextPayment
 * @prop {number} original_amount
 * @prop {number} amount
 * @prop {string} interval
 * @prop {string} currency
 * @prop {SubscriptionDiscount|null} discount
 */

/**
 * @typedef {object} ActiveDiscount
 * @prop {Date} start
 * @prop {Date|null} end
 */

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'unpaid', 'past_due'];

/**
 * Calculates the next payment information for a subscription
 */
class NextPaymentCalculator {
    /**
     * Calculate the next payment for a subscription
     * @param {object} subscription - The subscription object (serialized), with offer attached
     * @returns {NextPayment|null}
     */
    calculate(subscription) {
        if (!this._isActiveSubscription(subscription)) {
            return null;
        }

        const originalAmount = subscription.plan.amount;
        const interval = subscription.plan.interval;
        const currency = subscription.plan.currency;
        const offer = subscription.offer || null;

        if (!offer || offer.type === 'trial') {
            return {
                original_amount: originalAmount,
                amount: originalAmount,
                interval,
                currency,
                discount: null
            };
        }

        const activeDiscount = this._getActiveDiscount(subscription, offer);

        if (!activeDiscount) {
            return {
                original_amount: originalAmount,
                amount: originalAmount,
                interval,
                currency,
                discount: null
            };
        }

        const discountedAmount = this._calculateDiscountedAmount(originalAmount, offer);

        return {
            original_amount: originalAmount,
            amount: discountedAmount,
            interval,
            currency,
            discount: {
                offer_id: offer.id,
                start: activeDiscount.start ? new Date(activeDiscount.start).toISOString() : null,
                end: activeDiscount.end ? new Date(activeDiscount.end).toISOString() : null,
                duration: offer.duration,
                type: offer.type,
                amount: offer.amount
            }
        };
    }

    /**
     * Check if the subscription is active
     * @param {object} subscription
     * @returns {boolean}
     */
    _isActiveSubscription(subscription) {
        return ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
    }

    /**
     * Get the active discount for the subscription, if any
     * Returns null if no discount is active, otherwise returns the discount start and end dates
     * Handles backportability for signup offers without explicit discount_start/discount_end
     * @param {object} subscription
     * @param {OfferDTO} offer
     * @returns {ActiveDiscount|null}
     */
    _getActiveDiscount(subscription, offer) {
        if (subscription.discount_start) {
            return {
                start: subscription.discount_start,
                end: subscription.discount_end
            };
        }

        // Backportability for signup offers without discount_start / discount_end
        if (offer.redemption_type !== 'signup') {
            return null;
        }

        // Signup offers with once have already been applied to first payment
        if (offer.duration === 'once') {
            return null;
        }

        // Signup offer with forever don't expire
        if (offer.duration === 'forever') {
            return {start: subscription.start_date, end: null};
        }

        // Signup repeating offer expire after start_date + duration_in_months
        if (offer.duration === 'repeating' && offer.duration_in_months > 0) {
            const end = new Date(subscription.start_date);
            end.setUTCMonth(end.getUTCMonth() + offer.duration_in_months);

            if (new Date() >= end) {
                return null;
            }

            return {start: subscription.start_date, end};
        }

        return null;
    }

    /**
     * Calculate the discounted amount
     * @param {number} originalAmount
     * @param {OfferDTO} offer
     * @returns {number}
     */
    _calculateDiscountedAmount(originalAmount, offer) {
        if (offer.type === 'percent') {
            const discount = Math.round(originalAmount * (offer.amount / 100));
            return Math.max(0, originalAmount - discount);
        }

        if (offer.type === 'fixed') {
            return Math.max(0, originalAmount - offer.amount);
        }

        return originalAmount;
    }
}

module.exports = NextPaymentCalculator;
