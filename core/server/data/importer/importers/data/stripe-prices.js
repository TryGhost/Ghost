const BaseImporter = require('./base');

class StripePricesImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripePrice',
            dataKeyToImport: 'stripe_prices'
        });
    }
}

module.exports = StripePricesImporter;
