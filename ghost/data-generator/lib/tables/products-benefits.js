const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class ProductsBenefitsImporter extends TableImporter {
    constructor(knex, {benefits}) {
        super('products_benefits', knex);
        this.benefits = benefits;
        this.sortOrder = 0;
    }

    // eslint-disable-next-line no-unused-vars
    setImportOptions({amount: _amount, model}) {
        this.model = model;
        this.sortOrder = 0;
        switch (this.model.name) {
        case 'Bronze':
            this.benefitCount = 1;
            break;
        case 'Silver':
            this.benefitCount = 3;
            break;
        case 'Gold':
            this.benefitCount = 5;
            break;
        }
    }

    generate() {
        if (this.sortOrder >= this.benefitCount) {
            // No more benefits than benefitCount
            return null;
        }
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: faker.database.mongodbObjectId(),
            product_id: this.model.id,
            benefit_id: this.benefits[sortOrder].id,
            sort_order: sortOrder
        };
    }
}

module.exports = ProductsBenefitsImporter;
