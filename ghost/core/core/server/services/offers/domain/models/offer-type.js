const ValueObject = require('./shared/value-object');
const InvalidOfferType = require('../errors').InvalidOfferType;

/** @extends ValueObject<'fixed'|'percent'|'trial'|'free_months'> */
class OfferType extends ValueObject {
    /** @param {unknown} type */
    static create(type) {
        if (!type || typeof type !== 'string') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be a string.'
            });
        }
        if (type !== 'percent' && type !== 'fixed' && type !== 'trial' && type !== 'free_months') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be one of "percent", "fixed", "trial" or "free_months".'
            });
        }

        return new OfferType(type);
    }

    static InvalidOfferType = InvalidOfferType;

    static Percentage = new OfferType('percent');

    static Fixed = new OfferType('fixed');

    static Trial = new OfferType('trial');

    static FreeMonths = new OfferType('free_months');
}

module.exports = OfferType;
