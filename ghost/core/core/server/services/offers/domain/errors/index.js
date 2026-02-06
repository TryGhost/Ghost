const {ValidationError} = require('@tryghost/errors');

class InvalidPropError extends ValidationError {
    /** @param {any} options */
    constructor(options) {
        super({
            statusCode: 400,
            ...options
        });
        this.errorType = this.constructor.name;
    }
}

class InvalidOfferName extends InvalidPropError {}
class InvalidOfferTitle extends InvalidPropError {}
class InvalidOfferDescription extends InvalidPropError {}
class InvalidOfferCode extends InvalidPropError {}
class InvalidOfferType extends InvalidPropError {}
class InvalidOfferAmount extends InvalidPropError {}
class InvalidOfferCurrency extends InvalidPropError {}
class InvalidOfferTierName extends InvalidPropError {}
class InvalidOfferCadence extends InvalidPropError {}
class InvalidOfferDuration extends InvalidPropError {}
class InvalidOfferCoupon extends InvalidPropError {}
class InvalidOfferStatus extends InvalidPropError {}
class InvalidOfferRedemptionType extends InvalidPropError {}
class InvalidStripeCoupon extends InvalidPropError {}

module.exports = {
    InvalidOfferName,
    InvalidOfferTitle,
    InvalidOfferDescription,
    InvalidOfferCode,
    InvalidOfferType,
    InvalidOfferAmount,
    InvalidOfferCurrency,
    InvalidOfferCadence,
    InvalidOfferDuration,
    InvalidOfferTierName,
    InvalidOfferCoupon,
    InvalidOfferStatus,
    InvalidOfferRedemptionType,
    InvalidStripeCoupon
};
