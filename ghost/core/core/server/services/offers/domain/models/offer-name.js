const ValueObject = require('./shared/value-object');
const InvalidOfferName = require('../errors').InvalidOfferName;

/** @extends ValueObject<string> */
class OfferName extends ValueObject {
    /** @param {unknown} name */
    static create(name) {
        if (!name || typeof name !== 'string') {
            throw new InvalidOfferName({
                message: 'Offer `name` must be a string.'
            });
        }

        if (name.length > 40) {
            throw new InvalidOfferName({
                message: 'Offer `name` can be a maximum of 40 characters.'
            });
        }

        return new OfferName(name.trim());
    }

    static InvalidOfferName = InvalidOfferName;
}

module.exports = OfferName;
