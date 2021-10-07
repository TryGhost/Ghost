const {GhostError} = require('@tryghost/errors');

class InvalidPropError extends GhostError {
    static message = 'Invalid Offer property';
    /** @param {any} options */
    constructor(options) {
        super({
            statusCode: 400
        });
        this.errorType = this.constructor.name;
        this.message = options.message || this.constructor.message;
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
class InvalidOfferCoupon extends InvalidPropError {}

module.exports = {
    InvalidOfferName,
    InvalidOfferTitle,
    InvalidOfferDescription,
    InvalidOfferCode,
    InvalidOfferType,
    InvalidOfferAmount,
    InvalidOfferCurrency,
    InvalidOfferCadence,
    InvalidOfferTierName,
    InvalidOfferCoupon
};
