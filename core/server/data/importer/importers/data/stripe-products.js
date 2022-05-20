const BaseImporter = require('./base');

class StripeProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripeProduct',
            dataKeyToImport: 'stripe_products'
        });
    }
}

module.exports = StripeProductsImporter;
