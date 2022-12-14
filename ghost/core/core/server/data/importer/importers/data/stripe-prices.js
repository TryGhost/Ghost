const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:stripeprices');
const BaseImporter = require('./base');
const models = require('../../../../models');

class StripePricesImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripePrice',
            dataKeyToImport: 'stripe_prices',
            requiredImportedData: ['stripe_products'],
            requiredExistingData: ['stripe_products']
        });
    }

    fetchExisting(modelOptions) {
        return models.StripePrice.findAll(_.merge({columns: ['id', 'stripe_product_id']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    validateStripeProduct() {
        // ensure we have a valid stripe_product_id in the stripe_products table
        let invalidPrices = [];
        _.each(this.dataToImport, (objectInFile) => {
            const importedObject = _.find(
                this.requiredImportedData.stripe_products,
                {stripe_product_id: objectInFile.stripe_product_id}
            );
            // CASE: we've imported the stripe_product
            if (importedObject) {
                return;
            }
            const existingObject = _.find(
                this.requiredExistingData.stripe_products,
                {stripe_product_id: objectInFile.stripe_product_id}
            );
            // CASE: stripe product already exists in the DB
            if (existingObject) {
                return;
            }
            // CASE: we don't know what stripe product this is for
            debug(`ignoring invalid product ${objectInFile.stripe_product_id}`);
            invalidPrices.push(objectInFile.id);
        });
        // ignore prices with invalid products
        debug(`ignoring ${invalidPrices.length} products`);
        this.dataToImport = this.dataToImport.filter(item => !invalidPrices.includes(item.id));
    }

    replaceIdentifiers() {
        // this has to be in replaceIdentifiers because it's after required* fields are set
        this.validateStripeProduct();
        return super.replaceIdentifiers();
    }
}

module.exports = StripePricesImporter;
