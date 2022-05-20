const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');

class ProductsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Product',
            dataKeyToImport: 'products',
            requiredFromFile: ['stripe_prices'],
            requiredExistingData: ['stripe_prices']
        });
    }

    fetchExisting(modelOptions) {
        return models.Product.findAll(_.merge({columns: ['products.id as id']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    mapImportedData(originalObject, importedObject) {
        return {
            id: importedObject.id,
            originalId: this.originalIdMap[importedObject.id],
            monthly_price_id: originalObject.monthly_price_id,
            yearly_price_id: originalObject.yearly_price_id
        };
    }

    validateStripePrice() {
        // the stripe price either needs to exist in the current db,
        // or be imported as part of the same import
        let invalidProducts = [];
        _.each(['monthly_price_id', 'yearly_price_id'], (field) => {
            _.each(this.dataToImport, (objectInFile) => {
                const importedObject = _.find(
                    this.requiredFromFile.stripe_prices,
                    {id: objectInFile[field]}
                );
                // CASE: we'll import the stripe price later
                if (importedObject) {
                    return;
                }
                const existingObject = _.find(
                    this.requiredExistingData.stripe_prices,
                    {id: objectInFile[field]}
                );
                // CASE: stripe price already exists in the DB
                if (existingObject) {
                    return;
                }
                // CASE: we don't know what stripe price this is for
                invalidProducts.push(objectInFile.id);
            });
        });
        // ignore prices with invalid products
        this.dataToImport = this.dataToImport.filter(item => !invalidProducts.includes(item.id));
    }

    replaceIdentifiers() {
        // this has to be in replaceIdentifiers because it's after required* fields are set
        this.validateStripePrice();
        return super.replaceIdentifiers();
    }
}

module.exports = ProductsImporter;
