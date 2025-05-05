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
        // Check currency is a 3 character string consisting of only letters (case insensitive)
        if (!currency.match(/^[A-Z]{3}$/i)) {
            throw new InvalidOfferCurrency({
                message: 'Offer `currency` must be an ISO currency code.'
            });
        }
        // TODO: Validate it is a country code we support?
        return new OfferCurrency(currency.toUpperCase());
    }

    static InvalidOfferCurrency = InvalidOfferCurrency;
}

module.exports = OfferCurrency;
