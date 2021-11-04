const ValueObject = require('./shared/ValueObject');
const InvalidOfferCadence = require('../errors').InvalidOfferCadence;

/**
 * @extends ValueObject<'month'|'year'>
 */
class OfferCadence extends ValueObject {
    /** @param {unknown} cadence */
    static create(cadence) {
        if (!cadence || typeof cadence !== 'string') {
            throw new InvalidOfferCadence({
                message: 'Offer `cadence` must be a string.'
            });
        }
        if (cadence !== 'month' && cadence !== 'year') {
            throw new InvalidOfferCadence({
                message: 'Offer `cadence` must be one of "month" or "year".'
            });
        }
        return new OfferCadence(cadence);
    }

    static InvalidOfferCadence = InvalidOfferCadence;
}

module.exports = OfferCadence;
