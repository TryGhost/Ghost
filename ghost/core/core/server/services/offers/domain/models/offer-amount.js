const ValueObject = require('./shared/value-object');
const InvalidOfferAmount = require('../errors').InvalidOfferAmount;

/** @extends ValueObject<number> */
class OfferAmount extends ValueObject {}

class OfferPercentageAmount extends OfferAmount {
    /** @param {unknown} amount */
    static create(amount) {
        if (typeof amount !== 'number') {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be an integer between 0 and 100.'
            });
        }
        if (!Number.isInteger(amount)) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be an integer between 0 and 100.'
            });
        }
        if (amount < 0 || amount > 100) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be an integer between 0 and 100.'
            });
        }
        return new OfferPercentageAmount(amount);
    }

    static InvalidOfferAmount = InvalidOfferAmount;
}

class OfferFixedAmount extends OfferAmount {
    /** @param {unknown} amount */
    static create(amount) {
        if (typeof amount !== 'number') {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be an integer greater than 0.'
            });
        }
        if (!Number.isInteger(amount)) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be a integer greater than 0.'
            });
        }
        if (amount < 0) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be a integer greater than 0.'
            });
        }
        return new OfferPercentageAmount(amount);
    }

    static InvalidOfferAmount = InvalidOfferAmount;
}

class OfferTrialAmount extends OfferAmount {
    /** @param {unknown} amount */
    static create(amount) {
        if (typeof amount !== 'number') {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be an integer greater than 0.'
            });
        }
        if (!Number.isInteger(amount)) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be a integer greater than 0.'
            });
        }
        if (amount < 0) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be a integer greater than 0.'
            });
        }
        return new OfferTrialAmount(amount);
    }

    static InvalidOfferAmount = InvalidOfferAmount;
}

module.exports = OfferAmount;
module.exports.OfferPercentageAmount = OfferPercentageAmount;
module.exports.OfferFixedAmount = OfferFixedAmount;
module.exports.OfferTrialAmount = OfferTrialAmount;
