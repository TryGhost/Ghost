const ValueObject = require('./shared/value-object');

const InvalidStripeCoupon = require('../errors').InvalidStripeCoupon;

/**
 * @typedef {Object} StripeCouponInput
 * @property {string} id
 * @property {number} [percent_off]
 * @property {number} [amount_off]
 * @property {string} [currency]
 * @property {string} duration
 * @property {number} [duration_in_months]
 */

/** @extends ValueObject<StripeCouponInput> **/
class StripeCoupon extends ValueObject {
    /** @returns {string} */
    get id() {
        return this.value.id;
    }

    /** @returns {number|undefined} */
    get percent_off() {
        return this.value.percent_off;
    }

    /** @returns {number|undefined} */
    get amount_off() {
        return this.value.amount_off;
    }

    /** @returns {string|undefined} */
    get currency() {
        return this.value.currency;
    }

    /** @returns {string} */
    get duration() {
        return this.value.duration;
    }

    /** @returns {number|undefined} */
    get duration_in_months() {
        return this.value.duration_in_months;
    }

    /** @param {unknown} coupon */
    static create(coupon) {
        if (!coupon || typeof coupon !== 'object') {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon is required.'
            });
        }

        /** @type {StripeCouponInput} */
        const input = /** @type {StripeCouponInput} */ (coupon);

        if (!input.id || typeof input.id !== 'string') {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon `id` is required and must be a string.'
            });
        }

        if (!input.percent_off && !input.amount_off) {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon must have either `percent_off` or `amount_off` set.'
            });
        }

        if (input.percent_off && input.amount_off) {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon must have either `percent_off` or `amount_off` but not both.'
            });
        }

        if (input.percent_off && typeof input.percent_off !== 'number') {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon `percent_off` must be a number.'
            });
        }

        if (input.amount_off && typeof input.amount_off !== 'number') {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon `amount_off` must be a number.'
            });
        }

        if (input.amount_off && (!input.currency || typeof input.currency !== 'string')) {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon `amount_off` must have a `currency` set.'
            });
        }

        if (!input.duration || typeof input.duration !== 'string') {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon `duration` is required and must be a string.'
            });
        }

        if (input.duration_in_months && typeof input.duration_in_months !== 'number') {
            throw new InvalidStripeCoupon({
                message: 'Stripe coupon `duration_in_months` must be a number.'
            });
        }

        return new StripeCoupon(input);
    }

    static InvalidStripeCoupon = InvalidStripeCoupon;
}

module.exports = StripeCoupon;
