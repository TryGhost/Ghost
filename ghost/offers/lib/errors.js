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

class InvalidOfferNameError extends InvalidPropError {
    static message = 'Invalid offer name!';
}
class InvalidOfferDisplayTitle extends InvalidPropError {}
class InvalidOfferDisplayDescription extends InvalidPropError {}
class InvalidOfferCode extends InvalidPropError {}
class InvalidOfferType extends InvalidPropError {}
class InvalidOfferAmount extends InvalidPropError {}
class InvalidOfferCurrency extends InvalidPropError {}
class InvalidOfferTierName extends InvalidPropError {}
class InvalidOfferCadence extends InvalidPropError {}
class InvalidOfferCoupon extends InvalidPropError {}

module.exports = {
    InvalidOfferNameError,
    InvalidOfferDisplayTitle,
    InvalidOfferDisplayDescription,
    InvalidOfferCode,
    InvalidOfferType,
    InvalidOfferAmount,
    InvalidOfferCurrency,
    InvalidOfferCadence,
    InvalidOfferTierName,
    InvalidOfferCoupon
};
