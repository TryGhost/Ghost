const ValueObject = require('./shared/ValueObject');
const InvalidOfferType = require('../errors').InvalidOfferType;

/** @extends ValueObject<'fixed'|'percent'> */
class OfferType extends ValueObject {
    /** @param {unknown} type */
    static create(type) {
        if (!type || typeof type !== 'string') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be a string.'
            });
        }
        if (type !== 'percent' && type !== 'fixed') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be one of "percent" or "fixed".'
            });
        }

        return new OfferType(type);
    }

    static InvalidOfferType = InvalidOfferType;

    static Percentage = new OfferType('percent');

    static Fixed = new OfferType('fixed');
}

module.exports = OfferType;
