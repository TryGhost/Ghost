const ValueObject = require('./shared/ValueObject');
const InvalidOfferStatus = require('../errors').InvalidOfferStatus;

/** @extends ValueObject<'active'|'archived'> */
class OfferStatus extends ValueObject {
    /** @param {unknown} status */
    static create(status) {
        if (typeof status !== 'string') {
            throw new InvalidOfferStatus({
                message: 'Offer `status` must be a string.'
            });
        }

        if (status !== 'active' && status !== 'archived') {
            throw new InvalidOfferStatus({
                message: 'Offer `status` must be either "active" or "archived".'
            });
        }
        return new OfferStatus(status);
    }

    static InvalidOfferStatus = InvalidOfferStatus;
}

module.exports = OfferStatus;
