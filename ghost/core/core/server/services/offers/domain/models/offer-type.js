const ValueObject = require('./shared/value-object');
const InvalidOfferType = require('../errors').InvalidOfferType;

/** @extends ValueObject<'fixed'|'percent'|'trial'> */
class OfferType extends ValueObject {
    /** @param {unknown} type */
    static create(type) {
        if (!type || typeof type !== 'string') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be a string.'
            });
        }
        if (type !== 'percent' && type !== 'fixed' && type !== 'trial') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be one of "percent", "fixed" or "trial".'
            });
        }

        return new OfferType(type);
    }

    static InvalidOfferType = InvalidOfferType;

    static Percentage = new OfferType('percent');

    static Fixed = new OfferType('fixed');

    static Trial = new OfferType('trial');
}

module.exports = OfferType;
