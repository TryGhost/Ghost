const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class ProductsBenefitsImporter extends TableImporter {
    static table = 'products_benefits';

    constructor(knex, {benefits}) {
        super(ProductsBenefitsImporter.table, knex);
        this.benefits = benefits;
        this.sortOrder = 0;
    }

    setImportOptions({model}) {
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
        case 'Free Preview':
            this.benefitCount = 0;
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
