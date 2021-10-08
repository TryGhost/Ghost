const ValueObject = require('./shared/ValueObject');
const InvalidOfferCurrency = require('../errors').InvalidOfferCurrency;

/** @extends ValueObject<string> */
class OfferCurrency extends ValueObject {
    /** @param {unknown} currency */
    static create(currency) {
        if (typeof currency !== 'string') {
            throw new InvalidOfferCurrency({
                message: 'Offer `currency` must be a string.'
            });
        }
        // TODO: Validate it is a country code we support?
        return new OfferCurrency(currency);
    }
}

module.exports = OfferCurrency;
