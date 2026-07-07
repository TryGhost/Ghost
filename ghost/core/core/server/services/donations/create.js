const {DonationBookshelfRepository} = require('./donation-bookshelf-repository');

/**
 * @param {object} deps
 * @param {object} deps.models
 */
module.exports = function createDonationService({models}) {
    return {
        repository: new DonationBookshelfRepository({
            DonationPaymentEventModel: models.DonationPaymentEvent
        }),
        init() {}
    };
};
