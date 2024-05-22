const ValueObject = require('./shared/ValueObject');
const InvalidOfferTitle = require('../errors').InvalidOfferTitle;

/** @extends ValueObject<string> */
class OfferTitle extends ValueObject {
    /** @param {unknown} title */
    static create(title) {
        if (title === null || title === undefined) {
            return new OfferTitle('');
        }
        if (typeof title !== 'string') {
            throw new InvalidOfferTitle({
                message: 'Offer `display_title` must be a string.'
            });
        }

        if (title.length > 191) {
            throw new InvalidOfferTitle({
                message: 'Offer `display_title` can be a maximum of 191 characters.'
            });
        }

        return new OfferTitle(title.trim());
    }

    static InvalidOfferTitle = InvalidOfferTitle;
}

module.exports = OfferTitle;
