const {DonationPaymentEvent: DonationPaymentEventModel} = require('../../models');

class DonationServiceWrapper {
    repository;

    init() {
        if (this.repository) {
            return;
        }

        const {DonationBookshelfRepository} = require('./DonationBookshelfRepository');

        this.repository = new DonationBookshelfRepository({
            DonationPaymentEventModel
        });
    }
}

module.exports = DonationServiceWrapper;
