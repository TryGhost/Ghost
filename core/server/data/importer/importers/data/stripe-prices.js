const BaseImporter = require('./base');

class StripePricesImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripePrice',
            dataKeyToImport: 'stripe_prices'
        });
    }

    //@TODO: ensure stripe_product_id exists in either the import or the db
    // stripe_prices.stripe_product_id -> stripe_products.stripe_product_id
}

module.exports = StripePricesImporter;
