const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:stripeproducts');
const BaseImporter = require('./base');
const models = require('../../../../models');

class StripeProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripeProduct',
            dataKeyToImport: 'stripe_products',
            requiredImportedData: ['products'],
            requiredExistingData: ['products']
        });
    }

    fetchExisting(modelOptions) {
        return models.StripeProduct.findAll(_.merge({columns: ['id', 'stripe_product_id']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    mapImportedData(originalObject, importedObject) {
        return {
            id: importedObject.id,
            originalId: this.originalIdMap[importedObject.id],
            stripe_product_id: originalObject.stripe_product_id
        };
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
