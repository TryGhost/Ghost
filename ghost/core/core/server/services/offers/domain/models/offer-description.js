const ValueObject = require('./shared/value-object');
const InvalidOfferDescription = require('../errors').InvalidOfferDescription;

const MAX_OFFER_DESCRIPTION_LENGTH = 2000;

/** @extends ValueObject<string> */
class OfferDescription extends ValueObject {
    /** @param {unknown} description */
    static create(description) {
        if (description === null || description === undefined) {
            return new OfferDescription('');
        }

        if (typeof description !== 'string') {
            throw new InvalidOfferDescription({
                message: 'Offer `display_description` must be a string.'
            });
        }

        if (description.length > MAX_OFFER_DESCRIPTION_LENGTH) {
            throw new InvalidOfferDescription({
                message: `Offer \`display_description\` can be a maximum of ${MAX_OFFER_DESCRIPTION_LENGTH} characters.`
            });
        }

        return new OfferDescription(description.trim());
    }

    static InvalidOfferDescription = InvalidOfferDescription;
}

module.exports = OfferDescription;
