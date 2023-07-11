const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:stripeproducts');
const BaseImporter = require('./Base');
const models = require('../../../../models');

class StripeProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripeProduct',
            dataKeyToImport: 'stripe_products',
            requiredFromFile: ['products'],
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

            const existingObjectById = _.find(this.requiredExistingData.products, {id: objectInFile.product_id});
            // CASE: the product exists in the db already
            if (existingObjectById) {
                return;
            }

            // CASE: we skipped product import because a product with the same name and slug exists in the DB
            debug('lookup product by name and slug');
            const productFromFile = _.find(
                this.requiredFromFile.products,
                {id: objectInFile.product_id}
            );
            if (productFromFile) {
                // look for the existing product with the same name and slug
                const existingObjectByNameAndSlug = _.find(
                    this.requiredExistingData.products,
                    {name: productFromFile.name, slug: productFromFile.slug}
                );
                if (existingObjectByNameAndSlug) {
                    debug(`resolved ${objectInFile.product_id} to ${existingObjectByNameAndSlug.name}`);
                    objectInFile.product_id = existingObjectByNameAndSlug.id;
                    return;
                }
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
