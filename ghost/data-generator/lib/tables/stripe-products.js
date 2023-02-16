const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');
const {blogStartDate} = require('../utils/blog-info');

class StripeProductsImporter extends TableImporter {
    static table = 'stripe_products';
    constructor(knex) {
        super(StripeProductsImporter.table, knex);
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const sixWeeksLater = new Date(blogStartDate);
        sixWeeksLater.setDate(sixWeeksLater.getDate() + (7 * 6));
        return {
            id: faker.database.mongodbObjectId(),
            product_id: this.model.id,
            stripe_product_id: faker.datatype.hexadecimal({
                length: 64,
                prefix: ''
            }),
            created_at: faker.date.between(blogStartDate, sixWeeksLater)
        };
    }
}

module.exports = StripeProductsImporter;
