const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');

class ProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Product',
            dataKeyToImport: 'products'
        });
    }

    fetchExisting(modelOptions) {
        return models.Product.findAll(_.merge({columns: ['products.id as id']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }
}

module.exports = ProductsImporter;
