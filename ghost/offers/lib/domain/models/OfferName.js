const ValueObject = require('./shared/ValueObject');
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

        if (name.length > 191) {
            throw new InvalidOfferName({
                message: 'Offer `name` can be a maximum of 191 characters.'
            });
        }

        return new OfferName(name);
    }
}

module.exports = OfferName;
