const ValueObject = require('./shared/ValueObject');
const InvalidOfferCreatedAt = require('../errors').InvalidOfferCreatedAt;

/** @extends ValueObject<string> */
class OfferCreatedAt extends ValueObject {
    /** @param {Date} createdAt */
    constructor(createdAt) {
        super(createdAt.toISOString()); // Convert Date to ISO string
    }

    static create(createdAt) {
        if (createdAt === null || createdAt === undefined) {
            createdAt = new Date();
        }

        if (!(createdAt instanceof Date)) {
            throw new InvalidOfferCreatedAt({
                message: 'Offer `created_at` must be a Date.'
            });
        }

        const date = new Date(createdAt);
        date.setMilliseconds(0);

        return date.toISOString();
    }

    static InvalidOfferCreatedAt = InvalidOfferCreatedAt;
}

module.exports = OfferCreatedAt;
