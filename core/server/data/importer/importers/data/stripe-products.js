const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:stripeproducts');
const BaseImporter = require('./base');

class StripeProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripeProduct',
            dataKeyToImport: 'stripe_products',
            requiredImportedData: ['products'],
            requiredExistingData: ['products']
        });
    }

    replaceIdentifiers() {
        debug('replaceIdentifiers');

        // map product_id -> product.id
        let invalidProducts = [];
        _.each(this.dataToImport, (objectInFile) => {
            const importedObject = _.find(this.requiredImportedData.products, {originalId: objectInFile.product_id});
            // CASE: we've imported the product and need to map the ID
            if (importedObject) {
                debug(`replaced product_id ${objectInFile.product_id} with ${importedObject.id}`);
                objectInFile.product_id = importedObject.id;
                return;
            }
            const existingObject = _.find(this.requiredExistingData.products, {id: objectInFile.product_id});
            // CASE: the product exists in the db already
            if (existingObject) {
                return;
            }
            // CASE: we don't know what product this is for
            debug(`ignoring stripe product ${objectInFile.stripe_product_id}`);
            invalidProducts.push(objectInFile.id);
        });
        // ignore Stripe products without Ghost products
        debug(`ignoring ${invalidProducts.length} products`);
        this.dataToImport = this.dataToImport.filter(item => !invalidProducts.includes(item.id));

        return super.replaceIdentifiers();
    }
}

module.exports = StripeProductsImporter;
