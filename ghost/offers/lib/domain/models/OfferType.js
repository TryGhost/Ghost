const ValueObject = require('../../shared/ValueObject');
const InvalidOfferType = require('../../errors').InvalidOfferType;

/** @extends ValueObject<'amount'|'percent'> */
class OfferType extends ValueObject {
    /** @param {unknown} type */
    static create(type) {
        if (!type || typeof type !== 'string') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be a string.'
            });
        }
        if (type !== 'percent' && type !== 'amount') {
            throw new InvalidOfferType({
                message: 'Offer `type` must be one of "percent" or "amount".'
            });
        }

        return new OfferType(type);
    }

    static Percent = new OfferType('percent')

    static Amount = new OfferType('amount')
}

module.exports = OfferType;
