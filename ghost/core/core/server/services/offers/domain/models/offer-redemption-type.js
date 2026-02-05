const ValueObject = require('./shared/value-object');
const InvalidOfferRedemptionType = require('../errors').InvalidOfferRedemptionType;

/**
 * @extends ValueObject<'signup'|'retention'>
 */
class OfferRedemptionType extends ValueObject {
    /** @param {unknown} redemptionType */
    static create(redemptionType) {
        if (typeof redemptionType !== 'string') {
            throw new InvalidOfferRedemptionType({
                message: 'Offer `redemption_type` must be a string.'
            });
        }

        if (redemptionType !== 'signup' && redemptionType !== 'retention') {
            throw new InvalidOfferRedemptionType({
                message: 'Offer `redemption_type` must be either "signup" or "retention".'
            });
        }

        return new OfferRedemptionType(redemptionType);
    }

    static InvalidOfferRedemptionType = InvalidOfferRedemptionType;

    static Signup = new OfferRedemptionType('signup');

    static Retention = new OfferRedemptionType('retention');
}

module.exports = OfferRedemptionType;
