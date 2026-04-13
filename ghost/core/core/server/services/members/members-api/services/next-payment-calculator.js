const getDiscountWindow = require('../utils/get-discount-window');

/**
 * @typedef {import('../../../../services/offers/application/offer-mapper').OfferDTO} OfferDTO
 */

/**
 * @typedef {object} SubscriptionDiscount
 * @prop {string} offer_id
 * @prop {string} start - ISO string for active discounts
 * @prop {string|null} end - ISO string for active once/repeating discounts, null for forever discounts
 * @prop {'once'|'repeating'|'forever'} duration
 * @prop {number|null} duration_in_months - Duration in months for repeating discounts, null for other types of discounts
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
        const defaultNextPayment = {
            original_amount: originalAmount,
            amount: originalAmount,
            interval,
            currency,
            discount: null
        };

        if (!offer || offer.type === 'trial') {
            return defaultNextPayment;
        }

        const activeDiscount = this._getActiveDiscount(subscription, offer);

        if (!activeDiscount) {
            return defaultNextPayment;
        }

        const discountedAmount = this._calculateDiscountedAmount(originalAmount, offer);

        return {
            ...defaultNextPayment,
            amount: discountedAmount,
            discount: {
                offer_id: offer.id,
                start: activeDiscount.start ? new Date(activeDiscount.start).toISOString() : null,
                end: activeDiscount.end ? new Date(activeDiscount.end).toISOString() : null,
                duration: offer.duration,
                duration_in_months: offer.duration_in_months,
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
        return getDiscountWindow(subscription, offer);
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
            return originalAmount - discount;
        }

        if (offer.type === 'fixed') {
            return Math.max(0, originalAmount - offer.amount);
        }

        return originalAmount;
    }
}

module.exports = NextPaymentCalculator;
