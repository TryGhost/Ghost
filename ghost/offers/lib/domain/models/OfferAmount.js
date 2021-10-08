const ValueObject = require('./shared/ValueObject');
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
}

class OfferFixedAmount extends OfferAmount {
    /** @param {unknown} amount */
    static create(amount) {
        if (typeof amount !== 'number') {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be a number greater than 0.'
            });
        }
        if (amount < 0) {
            throw new InvalidOfferAmount({
                message: 'Offer `amount` must be a number greater than 0.'
            });
        }
        const withTwoDecimalPlaces = +amount.toFixed(2);
        return new OfferPercentageAmount(withTwoDecimalPlaces);
    }
}

module.exports = OfferAmount;
module.exports.OfferPercentageAmount = OfferPercentageAmount;
module.exports.OfferFixedAmount = OfferFixedAmount;
