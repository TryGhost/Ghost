const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:stripeproducts');
const BaseImporter = require('./base');

class StripeProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'StripeProduct',
            dataKeyToImport: 'stripe_products',
            requiredImportedData: ['products']
        });
    }

    replaceIdentifiers() {
        debug('replaceIdentifiers');

        // map product_id -> product.id
        let invalidProducts = [];
        _.each(this.dataToImport, (objectInFile) => {
            const importedObject = _.find(this.requiredImportedData.products, {originalId: objectInFile.product_id});
            if (importedObject) {
                debug(`replaced product_id ${objectInFile.product_id} with ${importedObject.id}`);
                objectInFile.product_id = importedObject.id;
            } else {
                invalidProducts.push(objectInFile.id);
            }
        });
        // ignore prices without products
        debug(`ignoring ${invalidProducts.length} products`);
        this.dataToImport = this.dataToImport.filter(item => !invalidProducts.includes(item.id));

        return super.replaceIdentifiers();
    }
}

module.exports = StripeProductsImporter;
