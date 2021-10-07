const ValueObject = require('../../shared/ValueObject');
const InvalidOfferDuration = require('../../errors').InvalidOfferDuration;

/**
 * @extends ValueObject<'once'|'repeating'|'forever'>
 */
class OfferDuration extends ValueObject {
    /** @param {unknown} duration */
    static create(duration) {
        if (!duration || typeof duration !== 'string') {
            throw new InvalidOfferDuration({
                message: 'Offer `duration` must be a string.'
            });
        }
        if (duration !== 'once' && duration !== 'repeating' && duration !== 'forever') {
            throw new InvalidOfferDuration({
                message: 'Offer `duration` must be one of "once", "repeating" or "forever".'
            });
        }
        return new OfferDuration(duration);
    }
}

module.exports = OfferDuration;

