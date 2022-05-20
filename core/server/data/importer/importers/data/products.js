const BaseImporter = require('./base');

class ProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Product',
            dataKeyToImport: 'products'
        });
    }
}

module.exports = ProductsImporter;
