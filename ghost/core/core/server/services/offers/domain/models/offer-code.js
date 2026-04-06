const {slugify} = require('@tryghost/string');
const ValueObject = require('./shared/value-object');

const InvalidOfferCode = require('../errors').InvalidOfferCode;

/** @extends ValueObject<string> */
class OfferCode extends ValueObject {
    /** @param {unknown} code */
    static create(code) {
        if (!code || typeof code !== 'string') {
            throw new InvalidOfferCode({
                message: 'Offer `code` must be a string.'
            });
        }

        const slugged = slugify(code);

        if (slugged.length > 191) {
            throw new InvalidOfferCode({
                message: 'Offer `code` can be a maximum of 191 characters.'
            });
        }

        return new OfferCode(slugged);
    }

    static InvalidOfferCode = InvalidOfferCode;
}

module.exports = OfferCode;
